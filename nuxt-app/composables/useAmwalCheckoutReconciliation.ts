import {
  checkoutCreationJournalFromRaw,
  checkoutCreationJournalMatches,
} from '~/utils/checkoutState.js'

export interface AmwalCheckoutCreationJournal {
  checkoutKey: string
  ownerTabId: string
  createdAt: number
}

type ReconciliationResult =
  | { kind: 'found'; data: any }
  | { kind: 'absent' }
  | { kind: 'ambiguous' }

const JOURNAL_KEY = 'amwal_checkout_creation'
const ABSENCE_MIN_AGE_MS = 15_000
const RECONCILIATION_ATTEMPTS = 8

export const useAmwalCheckoutReconciliation = () => {
  const { $axios } = useNuxtApp()
  const tabLease = useAmwalCheckoutTabLease()

  const read = (): AmwalCheckoutCreationJournal | null => {
    if (!import.meta.client) return null
    return checkoutCreationJournalFromRaw(localStorage.getItem(JOURNAL_KEY))
  }

  const isCurrent = (expected: AmwalCheckoutCreationJournal) => (
    checkoutCreationJournalMatches(expected, read())
  )

  const write = (journal: AmwalCheckoutCreationJournal) => {
    if (!import.meta.client) return false
    const existing = read()
    if (existing) return checkoutCreationJournalMatches(existing, journal)
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal))
    return isCurrent(journal)
  }

  const claim = async (journal: AmwalCheckoutCreationJournal) => {
    if (!import.meta.client) return false

    const acquire = async () => {
      if (!write(journal)) return false
      // Give a browser without Web Locks one task boundary to settle a
      // simultaneous localStorage write, then keep only the exact winner.
      await new Promise(resolve => window.setTimeout(resolve, 0))
      return isCurrent(journal)
    }

    const locks = (navigator as Navigator & {
      locks?: { request: (name: string, options: Record<string, unknown>, callback: (lock: unknown) => Promise<boolean>) => Promise<boolean> }
    }).locks
    if (!locks?.request) return await acquire()

    return await locks.request(
      'isc-amwal-checkout-creation',
      { mode: 'exclusive', ifAvailable: true },
      async lock => lock ? await acquire() : false,
    )
  }

  const takeover = (
    expected: AmwalCheckoutCreationJournal,
    nextOwnerTabId = tabLease.currentTabId(),
  ): AmwalCheckoutCreationJournal | null => {
    if (!import.meta.client || !nextOwnerTabId || tabLease.ownerIsActive(expected.ownerTabId)) return null
    const actual = read()
    if (!checkoutCreationJournalMatches(expected, actual)) return null
    const claimed = { ...expected, ownerTabId: nextOwnerTabId }
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(claimed))
    return isCurrent(claimed) ? claimed : null
  }

  const clear = (expected: AmwalCheckoutCreationJournal) => {
    if (!import.meta.client) return false
    const actual = read()
    if (!checkoutCreationJournalMatches(expected, actual)) return false
    localStorage.removeItem(JOURNAL_KEY)
    return true
  }

  const reconcile = async (journal: AmwalCheckoutCreationJournal): Promise<ReconciliationResult> => {
    let observedOnlyNotFound = true

    for (let attempt = 0; attempt < RECONCILIATION_ATTEMPTS; attempt += 1) {
      try {
        const { data } = await $axios.get('/api/orders/checkout-reconciliation', {
          headers: { 'Idempotency-Key': journal.checkoutKey },
          withCredentials: true,
        })
        return { kind: 'found', data }
      } catch (error: any) {
        if (Number(error?.response?.status) !== 404) {
          observedOnlyNotFound = false
          break
        }
      }

      if (attempt < RECONCILIATION_ATTEMPTS - 1) {
        await new Promise(resolve => window.setTimeout(resolve, 500))
      }
    }

    if (observedOnlyNotFound && Date.now() - journal.createdAt >= ABSENCE_MIN_AGE_MS) {
      return { kind: 'absent' }
    }
    return { kind: 'ambiguous' }
  }

  return {
    journalKey: JOURNAL_KEY,
    claim,
    read,
    write,
    clear,
    isCurrent,
    reconcile,
    takeover,
  }
}
