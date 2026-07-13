const LEASE_KEY_PREFIX = 'amwal_checkout_tab_lease:'
const LEASE_TTL_MS = 60_000
const HEARTBEAT_MS = 5_000
let documentTabId = ''
let lifecycleListenersRegistered = false

const makeTabId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `amwal-tab-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export const useAmwalCheckoutTabLease = () => {
  let heartbeat: ReturnType<typeof window.setInterval> | null = null

  const currentTabId = () => {
    if (!import.meta.client) return ''
    // This identity intentionally lives only in this JavaScript document.
    // sessionStorage is copied by "Duplicate tab" and window.open(), which
    // would let a second document impersonate and cancel the first tab.
    if (!documentTabId) documentTabId = makeTabId()
    return documentTabId
  }

  const leaseKey = (tabId: string) => `${LEASE_KEY_PREFIX}${tabId}`

  const touch = () => {
    if (!import.meta.client) return
    const tabId = currentTabId()
    if (tabId) localStorage.setItem(leaseKey(tabId), String(Date.now()))
  }

  const release = () => {
    if (!import.meta.client || !documentTabId) return
    localStorage.removeItem(leaseKey(documentTabId))
  }

  const registerLifecycleListeners = () => {
    if (!import.meta.client || lifecycleListenersRegistered) return
    lifecycleListenersRegistered = true
    window.addEventListener('pagehide', release)
    window.addEventListener('pageshow', touch)
  }

  const ownerIsActive = (ownerTabId?: string | null, now = Date.now()) => {
    if (!import.meta.client) return false
    const owner = String(ownerTabId || '').trim()
    if (!owner) return false
    if (owner === currentTabId()) return true
    const touchedAt = Number(localStorage.getItem(leaseKey(owner)))
    return Number.isFinite(touchedAt) && touchedAt > 0 && now - touchedAt <= LEASE_TTL_MS
  }

  const start = () => {
    if (!import.meta.client || heartbeat !== null) return
    registerLifecycleListeners()
    touch()
    heartbeat = window.setInterval(touch, HEARTBEAT_MS)
  }

  const stop = () => {
    if (heartbeat === null) return
    window.clearInterval(heartbeat)
    heartbeat = null
  }

  return {
    currentTabId,
    leaseTtlMs: LEASE_TTL_MS,
    ownerIsActive,
    start,
    stop,
    touch,
  }
}
