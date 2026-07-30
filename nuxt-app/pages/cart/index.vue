<script setup lang="ts">
definePageMeta({ layout: 'layouts' })

// Imports
import { useCartStore } from '~/stores/cart'
import { useShippingQuotes } from '@/composables/useShippingQuotes'
import { buttonLabel, quantityButtonLabel } from '~/utils/accessibility.js'
import {
  cartRestorationIsSafe,
  classifyPendingPayment,
  checkoutStateOwnership,
  pendingCheckoutBelongsToTab,
  pendingCheckoutIdentityFromRaw,
  pendingCheckoutIdentityMatches,
  pendingCheckoutMarkerRelation,
  shouldPersistCheckout,
  shouldReuseCheckoutKey,
} from '~/utils/checkoutState.js'


interface Loactions {
  id: number;
  Location_Name: string;
  Location_Name_Ar: string;
}

interface PendingAmwalCheckoutIdentity {
  orderId: number
  checkoutKey: string
  ownerTabId?: string
}

type PendingRecoveryState = 'idle' | 'restoring' | 'error' | 'external'
type PendingRecoveryOutcome = 'none' | 'restored' | 'error' | 'redirected' | 'external'
type PendingRecoveryStepOutcome = PendingRecoveryOutcome | 'superseded'
type PendingMarkerClearOutcome = 'cleared' | 'missing' | 'replaced'

// Init first (so everything below can safely use them)
const { $r2Url, $axios } = useNuxtApp()
const cart = useCartStore()
const { user, isAuthenticated } = useAuth()
const { phoneCountryCodes, digitsOnly, formatPhone } = usePhoneCountryCodes()
const { t, field, productName, locale } = useStorefrontLocale()
const amwalCheckoutReconciliation = useAmwalCheckoutReconciliation()
const amwalTabLease = useAmwalCheckoutTabLease()

// Shipping quotes composable
const { options: shippingOptions, loading: quotesLoading, fetchQuotes, clear: clearShippingQuotes } = useShippingQuotes()

const isClient = import.meta.client
const CHECKOUT_IDEMPOTENCY_KEY = 'checkout_idempotency_key'
const CHECKOUT_IDEMPOTENCY_SIGNATURE = 'checkout_idempotency_signature'
const AMWAL_PENDING_ORDER_KEY = 'amwal_pending_order'
const AMWAL_FORCE_FRESH_KEY = 'amwal_force_fresh_checkout_key'
const SHIPPING_QUOTE_TTL_MS = 15 * 60 * 1000
const SHIPPING_QUOTE_DEBOUNCE_MS = 250
const cartMutationInFlight = ref(false)
const quantityMutationError = ref('')
const cartActionBlocked = computed(() => cartMutationInFlight.value || cart.quantitySyncPending)
const pendingAmwalCheckout = ref<PendingAmwalCheckoutIdentity | null>(null)
const pendingRecoveryState = ref<PendingRecoveryState>('idle')
const pendingRecoveryBlocked = computed(() => pendingRecoveryState.value !== 'idle')
const forceFreshCheckoutKey = ref(false)
let pendingRecoveryPromise: Promise<PendingRecoveryOutcome> | null = null
let pendingRecoveryRequested = false
let externalRecoveryTimer: ReturnType<typeof window.setTimeout> | null = null
let shippingQuoteTimer: number | null = null

const makeCheckoutIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const currentAmwalTabId = amwalTabLease.currentTabId

const checkoutSignature = () => JSON.stringify({
  deliveryMethod: cart.deliveryMethod,
  addressId: cart.selectedAddressId ?? null,
  locationId: cart.selectedLocationId ?? null,
  shippingOption: selectedOption.value ? {
    shipper_id: selectedOption.value.shipper_id,
    destination_id: selectedOption.value.destination_id,
    basis: selectedOption.value.basis,
    total_price: Number(selectedOption.value.total_price),
  } : null,
  items: cart.cartItems.map(i => ({
    id: i.id,
    quantity: i.quantity,
    price: cart.effectiveUnitPrice(i),
  })),
})

const ensureCheckoutIdempotencyKey = () => {
  if (!import.meta.client) return ''

  if (sessionStorage.getItem(AMWAL_FORCE_FRESH_KEY) === '1') {
    forceFreshCheckoutKey.value = true
  }

  const signature = checkoutSignature()
  const storedKey = localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY)
  const storedSignature = localStorage.getItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
  const pendingIdentity = pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
  const pendingKey = pendingIdentity?.checkoutKey || ''

  if (!forceFreshCheckoutKey.value && shouldReuseCheckoutKey({
    storedKey,
    storedSignature,
    signature,
    pendingKey,
    hasPendingRecord: Boolean(pendingIdentity),
    hasItems: cart.cartItems.length > 0,
  })) {
    return storedKey
  }

  let nextKey = makeCheckoutIdempotencyKey()
  if (pendingKey && nextKey === pendingKey) nextKey = makeCheckoutIdempotencyKey()
  localStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, nextKey)
  localStorage.setItem(CHECKOUT_IDEMPOTENCY_SIGNATURE, signature)
  forceFreshCheckoutKey.value = false
  sessionStorage.removeItem(AMWAL_FORCE_FRESH_KEY)

  return nextKey
}

const readCheckoutPrefillKey = () => {
  if (!import.meta.client) return ''

  try {
    const raw = localStorage.getItem('checkout_prefill')
    const parsed = raw ? JSON.parse(raw) : null
    return typeof parsed?.idempotencyKey === 'string' ? parsed.idempotencyKey.trim() : ''
  } catch {
    return ''
  }
}

const clearRecoveredCheckoutStateIfOwned = (expected: PendingAmwalCheckoutIdentity): PendingMarkerClearOutcome => {
  if (!import.meta.client) return 'missing'

  const actual = pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
  const initialRelation = pendingCheckoutMarkerRelation(expected, actual)
  if (initialRelation !== 'same') return initialRelation

  const ownership = checkoutStateOwnership({
    ownerKey: expected.checkoutKey,
    storedKey: localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY),
    prefillKey: readCheckoutPrefillKey(),
  })

  // Re-check the pending identity immediately before deleting it. A stale tab
  // must never detach a newer payment attempt written by another tab.
  const latest = pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
  const latestRelation = pendingCheckoutMarkerRelation(expected, latest)
  if (latestRelation !== 'same') return latestRelation

  localStorage.removeItem(AMWAL_PENDING_ORDER_KEY)
  forceFreshCheckoutKey.value = true
  if (ownership.ownsStoredKey && localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY) === expected.checkoutKey) {
    localStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY)
    localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
  }
  if (ownership.ownsPrefill && readCheckoutPrefillKey() === expected.checkoutKey) {
    localStorage.removeItem('checkout_prefill')
  }

  if (pendingCheckoutIdentityMatches(expected, pendingAmwalCheckout.value)) {
    pendingAmwalCheckout.value = null
  }

  return 'cleared'
}

const routeCapturedPaymentToOrders = async (pending: PendingAmwalCheckoutIdentity): Promise<PendingRecoveryOutcome> => {
  clearRecoveredCheckoutStateIfOwned(pending)

  try {
    await cart.loadCart()
  } catch {
    // The account page is authoritative for a captured/review payment.
  }

  await navigateTo('/account?tab=orders')
  return 'redirected'
}

const claimPendingCheckoutForCurrentTab = (
  rawPending: string,
  storedPending: PendingAmwalCheckoutIdentity,
): PendingAmwalCheckoutIdentity | 'external' | 'superseded' => {
  const tabId = currentAmwalTabId()
  if (!pendingCheckoutBelongsToTab(storedPending, tabId)
    && amwalTabLease.ownerIsActive(storedPending.ownerTabId)) return 'external'
  if (storedPending.ownerTabId === tabId) return storedPending

  // Claim a legacy marker or an expired tab's marker only if the exact raw
  // record is still current, so takeover cannot overwrite a newer attempt.
  if (localStorage.getItem(AMWAL_PENDING_ORDER_KEY) !== rawPending) return 'superseded'
  try {
    const parsed = JSON.parse(rawPending)
    const claimed = { ...parsed, ownerTabId: tabId }
    if (localStorage.getItem(AMWAL_PENDING_ORDER_KEY) !== rawPending) return 'superseded'
    localStorage.setItem(AMWAL_PENDING_ORDER_KEY, JSON.stringify(claimed))
    return { ...storedPending, ownerTabId: tabId }
  } catch {
    return 'superseded'
  }
}

const markerCleanupOutcome = (pending: PendingAmwalCheckoutIdentity): 'ready' | 'superseded' => {
  const outcome = clearRecoveredCheckoutStateIfOwned(pending)
  if (outcome !== 'replaced') return 'ready'

  pendingAmwalCheckout.value = pendingCheckoutIdentityFromRaw(
    localStorage.getItem(AMWAL_PENDING_ORDER_KEY),
  )
  pendingRecoveryState.value = 'restoring'
  return 'superseded'
}

const clearCreationCheckoutState = (
  journal: { checkoutKey: string; ownerTabId: string; createdAt: number },
  orderId: number,
) => {
  if (!amwalCheckoutReconciliation.isCurrent(journal)) return false
  const recoveredIdentity: PendingAmwalCheckoutIdentity = {
    orderId,
    checkoutKey: journal.checkoutKey,
    ownerTabId: journal.ownerTabId,
  }
  const marker = pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
  if (pendingCheckoutIdentityMatches(recoveredIdentity, marker)) {
    clearRecoveredCheckoutStateIfOwned(recoveredIdentity)
  } else if (!marker) {
    const ownership = checkoutStateOwnership({
      ownerKey: journal.checkoutKey,
      storedKey: localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY),
      prefillKey: readCheckoutPrefillKey(),
    })
    if (ownership.ownsStoredKey) {
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY)
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
    }
    if (ownership.ownsPrefill) localStorage.removeItem('checkout_prefill')
    forceFreshCheckoutKey.value = true
  }
  return amwalCheckoutReconciliation.clear(journal)
}

const finishCreationRecovery = async (
  journal: { checkoutKey: string; ownerTabId: string; createdAt: number },
  orderId: number,
) => {
  if (!clearCreationCheckoutState(journal, orderId)) return 'superseded' as const
  try {
    await cart.loadCart()
  } catch {
    pendingRecoveryState.value = 'error'
    return 'error' as const
  }
  pendingRecoveryState.value = 'idle'
  return 'restored' as const
}

const recoverOneAmwalCreationJournal = async (): Promise<PendingRecoveryStepOutcome> => {
  let journal = amwalCheckoutReconciliation.read()
  if (!journal) return 'none'
  if (journal.ownerTabId !== currentAmwalTabId()) {
    if (amwalTabLease.ownerIsActive(journal.ownerTabId)) {
      pendingRecoveryState.value = 'external'
      return 'external'
    }
    const claimed = amwalCheckoutReconciliation.takeover(journal)
    if (!claimed) return 'superseded'
    journal = claimed
  }

  pendingRecoveryState.value = 'restoring'
  clearShippingQuotes()
  selectedOptionKey.value = null
  const reconciliation = await amwalCheckoutReconciliation.reconcile(journal)
  if (reconciliation.kind === 'absent') {
    if (!amwalCheckoutReconciliation.clear(journal)) return 'superseded'
    pendingRecoveryState.value = 'idle'
    return 'none'
  }
  if (reconciliation.kind === 'ambiguous') {
    pendingRecoveryState.value = 'error'
    return 'error'
  }

  const responseData = reconciliation.data
  const orderId = Number(responseData?.order_id)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    pendingRecoveryState.value = 'error'
    return 'error'
  }

  const reconciledOutcome = classifyPendingPayment(responseData?.payment)
  if (reconciledOutcome === 'paid' || reconciledOutcome === 'review') {
    clearCreationCheckoutState(journal, orderId)
    return await routeCapturedPaymentToOrders({
      orderId,
      checkoutKey: journal.checkoutKey,
      ownerTabId: journal.ownerTabId,
    })
  }

  // Re-check immediately before the destructive request. A stale tab that
  // lost its lease must not cancel an attempt claimed by a newer tab while
  // reconciliation was in flight.
  if (!amwalCheckoutReconciliation.isCurrent(journal)) return 'superseded'

  try {
    const { data } = await $axios.post(
      `/api/payments/amwal/orders/${orderId}/cancel`,
      { restore_cart: true },
      { withCredentials: true },
    )
    const cancellationOutcome = classifyPendingPayment(data?.payment)
    if (cancellationOutcome === 'paid' || cancellationOutcome === 'review') {
      clearCreationCheckoutState(journal, orderId)
      return await routeCapturedPaymentToOrders({
        orderId,
        checkoutKey: journal.checkoutKey,
        ownerTabId: journal.ownerTabId,
      })
    }
    if (!cartRestorationIsSafe(data?.cancellation?.cart_restoration)) {
      pendingRecoveryState.value = 'error'
      return 'error'
    }
    return await finishCreationRecovery(journal, orderId)
  } catch {
    try {
      const { data } = await $axios.get(
        `/api/payments/amwal/orders/${orderId}/status`,
        { withCredentials: true },
      )
      const payment = data?.payment
      const outcome = classifyPendingPayment(payment)
      if (outcome === 'paid' || outcome === 'review') {
        clearCreationCheckoutState(journal, orderId)
        return await routeCapturedPaymentToOrders({
          orderId,
          checkoutKey: journal.checkoutKey,
          ownerTabId: journal.ownerTabId,
        })
      }
      if (outcome === 'terminal' && cartRestorationIsSafe(payment?.cart_restoration)) {
        return await finishCreationRecovery(journal, orderId)
      }
    } catch {
      // Retain the journal so a retry can resolve this ambiguous creation.
    }
    pendingRecoveryState.value = 'error'
    return 'error'
  }
}

const recoverOnePendingAmwalCheckout = async (): Promise<PendingRecoveryStepOutcome> => {
  if (!import.meta.client) return 'none'

  const rawPending = localStorage.getItem(AMWAL_PENDING_ORDER_KEY)
  let storedPending = pendingCheckoutIdentityFromRaw(rawPending)
  if (!storedPending) {
    // A malformed marker cannot identify a server order. Remove only that
    // marker; without an owner key, no checkout state can be safely detached.
    if (rawPending) {
      localStorage.removeItem(AMWAL_PENDING_ORDER_KEY)
      forceFreshCheckoutKey.value = true
    }
    pendingAmwalCheckout.value = null
    pendingRecoveryState.value = 'idle'
    return 'none'
  }

  const ownership = claimPendingCheckoutForCurrentTab(rawPending!, storedPending)
  if (ownership === 'external') {
    pendingAmwalCheckout.value = storedPending
    pendingRecoveryState.value = 'external'
    return 'external'
  }
  if (ownership === 'superseded') return 'superseded'
  storedPending = ownership

  const pending = storedPending
  pendingAmwalCheckout.value = pending
  pendingRecoveryState.value = 'restoring'
  clearShippingQuotes()
  selectedOptionKey.value = null

  let cancellation: any
  try {
    const { data } = await $axios.post(
      `/api/payments/amwal/orders/${pending.orderId}/cancel`,
      { restore_cart: true },
      { withCredentials: true },
    )
    cancellation = data
  } catch (error: any) {
    if (Number(error?.response?.status) === 404) {
      // The marker belongs to an order that is unavailable to this customer
      // (already removed, another account, or malformed stale state). It must
      // not keep the current cart locked.
      if (markerCleanupOutcome(pending) === 'superseded') return 'superseded'
      try {
        await cart.loadCart()
        pendingRecoveryState.value = 'idle'
        return 'restored'
      } catch {
        pendingRecoveryState.value = 'error'
        return 'error'
      }
    }

    // A capture notification may win the cancellation lock. Status is the
    // authoritative way to distinguish that race from a retryable failure.
    try {
      const { data } = await $axios.get(
        `/api/payments/amwal/orders/${pending.orderId}/status`,
        { withCredentials: true },
      )
      const payment = data?.payment
      const outcome = classifyPendingPayment(payment)
      if (outcome === 'paid' || outcome === 'review') {
        return await routeCapturedPaymentToOrders(pending)
      }
      if (outcome === 'terminal' && cartRestorationIsSafe(payment?.cart_restoration)) {
        if (markerCleanupOutcome(pending) === 'superseded') return 'superseded'
        await cart.loadCart()
        pendingRecoveryState.value = 'idle'
        return 'restored'
      }
    } catch {
      // Preserve the matching recovery marker so a retry cannot create a
      // second payment while the first attempt remains unresolved.
    }

    pendingRecoveryState.value = 'error'
    try {
      await cart.loadCart()
    } catch {
      // The retry action will reload the server cart again.
    }
    return 'error'
  }

  const paymentOutcome = classifyPendingPayment(cancellation?.payment)
  if (paymentOutcome === 'paid' || paymentOutcome === 'review') {
    return await routeCapturedPaymentToOrders(pending)
  }

  if (!cartRestorationIsSafe(cancellation?.cancellation?.cart_restoration)) {
    pendingRecoveryState.value = 'error'
    try {
      await cart.loadCart()
    } catch {
      // Keep the recovery marker and let the customer retry safely.
    }
    return 'error'
  }

  if (markerCleanupOutcome(pending) === 'superseded') return 'superseded'

  try {
    await cart.loadCart()
  } catch {
    pendingRecoveryState.value = 'error'
    return 'error'
  }

  pendingRecoveryState.value = 'idle'
  return 'restored'
}

const recoverPendingAmwalCheckout = async (): Promise<PendingRecoveryOutcome> => {
  pendingRecoveryRequested = true
  if (pendingRecoveryPromise) return pendingRecoveryPromise

  const run = async (): Promise<PendingRecoveryOutcome> => {
    let outcome: PendingRecoveryStepOutcome = 'none'
    do {
      pendingRecoveryRequested = false
      const creationOutcome = await recoverOneAmwalCreationJournal()
      if (['error', 'external', 'redirected'].includes(creationOutcome)) return creationOutcome as PendingRecoveryOutcome

      const pendingOutcome = await recoverOnePendingAmwalCheckout()
      outcome = pendingOutcome === 'none' && creationOutcome === 'restored'
        ? 'restored'
        : pendingOutcome
    } while (outcome === 'superseded' || pendingRecoveryRequested)
    return outcome
  }

  pendingRecoveryPromise = run().finally(() => {
    pendingRecoveryPromise = null
    if (pendingRecoveryRequested) void recoverPendingAmwalCheckout()
  })
  return pendingRecoveryPromise
}

const ensurePendingRecoveryBeforeCartAction = async () => {
  const marker = pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
  const creationJournal = amwalCheckoutReconciliation.read()
  if (!marker && !creationJournal) {
    if (pendingRecoveryState.value === 'external') pendingRecoveryState.value = 'idle'
    return pendingRecoveryState.value === 'idle'
  }

  pendingAmwalCheckout.value = marker
  const outcome = await recoverPendingAmwalCheckout()
  return (outcome === 'restored' || outcome === 'none')
    && pendingRecoveryState.value === 'idle'
    && !pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
    && !amwalCheckoutReconciliation.read()
}

const handlePendingAmwalStorage = (event: StorageEvent) => {
  if (![AMWAL_PENDING_ORDER_KEY, amwalCheckoutReconciliation.journalKey].includes(String(event.key))) return
  void (async () => {
    const outcome = await recoverPendingAmwalCheckout()
    if (outcome === 'none') {
      try {
        await cart.loadCart()
      } catch {
        pendingRecoveryState.value = 'error'
      }
    }
  })()
}

const retryPendingRecovery = async () => {
  if (pendingRecoveryState.value === 'restoring') return
  const outcome = await recoverPendingAmwalCheckout()
  if (outcome !== 'none') return

  pendingRecoveryState.value = 'restoring'
  try {
    await cart.loadCart()
    pendingRecoveryState.value = 'idle'
  } catch {
    pendingRecoveryState.value = 'error'
  }
}

watch(pendingRecoveryState, state => {
  if (!import.meta.client) return
  if (externalRecoveryTimer !== null) window.clearTimeout(externalRecoveryTimer)
  externalRecoveryTimer = null
  if (state !== 'external') return
  externalRecoveryTimer = window.setTimeout(() => {
    externalRecoveryTimer = null
    void recoverPendingAmwalCheckout()
  }, 5_000)
})


const locations = ref<Loactions[]>([])

const fetchLocations = async () => {
  try {
    const res = await $axios.get('/api/locations')
    locations.value = res.data
  } catch (e) {
    console.error('Failed to fetch locations', e)
  }
}

const selectCls =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm ' +
  'transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition ' +
  'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const textareaCls = inputCls + ' resize-y';


const totalsForQuotes = computed(() => {
  const weight = cart.cartItems.reduce((s, i) => s + ((i.weight || 0) * i.quantity), 0)
  const volume = cart.cartItems.reduce((s, i) => {
    const cbm = (i.length || 0) * (i.width || 0) * (i.height || 0)
    return s + (cbm * i.quantity)
  }, 0)
  return { weight_kg: +weight.toFixed(3), volume_cbm: +volume.toFixed(4) }
})



type Option = { id: number; Country_Name?: string; Region_Name?: string; District_Name?: string; City_Name?: string }



const optionKey = (o: any) => `${o.shipper_id}|${o.destination_id}|${o.basis}`
const selectedOptionKey = ref<string | null>(null)

const selectedOption = computed(() =>
  shippingOptions.value.find(o => optionKey(o) === selectedOptionKey.value) || null
)




// after fetchQuotes, auto-pick cheapest only if nothing selected or selection disappeared
const pickCheapestIfNeeded = () => {
  if (!shippingOptions.value.length) {
    selectedOptionKey.value = null
    return
  }
  const stillExists = selectedOptionKey.value &&
    shippingOptions.value.some(o => optionKey(o) === selectedOptionKey.value)

  if (!stillExists) {
    const cheapest = [...shippingOptions.value].sort(
      (a, b) => Number(a.total_price) - Number(b.total_price)
    )[0]
    selectedOptionKey.value = optionKey(cheapest)
  }
}





const itemsForQuote = computed(() =>
  cart.cartItems.map(i => ({
    product_id: Number(i.id),
    qty: Number(i.quantity),
  }))
)

const requestQuotes = async () => {
  if (
    pendingRecoveryBlocked.value
    || (import.meta.client && pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY)))
    || (import.meta.client && amwalCheckoutReconciliation.read())
  ) {
    clearShippingQuotes()
    selectedOptionKey.value = null
    return
  }

  if (cart.deliveryMethod !== 'ship') {
    clearShippingQuotes()
    selectedOptionKey.value = null
    return
  }

  if (!isAuthenticated.value || !cart.selectedAddressId) {
    clearShippingQuotes()
    selectedOptionKey.value = null
    return
  }

  const items = itemsForQuote.value
  if (!items.length) {
    clearShippingQuotes()
    selectedOptionKey.value = null
    return
  }

  selectedOptionKey.value = null
  const result = await fetchQuotes({
    address_id: Number(cart.selectedAddressId),
    items,
    include_heavy: false,
  })

  if (result === null) return

  // ✅ keep user's selection if still exists, else pick cheapest
  pickCheapestIfNeeded()
}








const quoteKey = computed(() => {
  const itemsKey = cart.cartItems.map(i => `${i.id}:${i.quantity}`).join('|')
  return `${cart.deliveryMethod}|${cart.selectedAddressId ?? ''}|${itemsKey}`
})

const scheduleQuoteRequest = () => {
  if (!import.meta.client) return
  if (shippingQuoteTimer !== null) window.clearTimeout(shippingQuoteTimer)

  shippingQuoteTimer = window.setTimeout(() => {
    shippingQuoteTimer = null

    // A quote must use the quantity confirmed by the cart API. Keep waiting
    // while rapid optimistic clicks are being coalesced and persisted.
    if (cart.quantitySyncPending) {
      scheduleQuoteRequest()
      return
    }

    void requestQuotes()
  }, SHIPPING_QUOTE_DEBOUNCE_MS)
}

watch(quoteKey, scheduleQuoteRequest, { immediate: true })

// Addresses
const addresses = ref<any[]>([])
const showAddressModal = ref(false)
const countries = ref<Option[]>([])
const titles = ref<any[]>([])
const regions = ref<Option[]>([])
const districts = ref<Option[]>([])
const states = ref<Option[]>([]) // kept for parity if you later need state-level
const cities = ref<Option[]>([])
const form = reactive({
  id: null as number | null,
  Country_Id: '' as number | string,
  Region_Id: '' as number | string,
  District_Id: '' as number | string,
  City_Id: '' as number | string,
  Contact_Person_Name: '',
  Telephone_Country_Code: '+968',
  Telephone: '',
  Title_Id: '' as number | string,
  Remarks: '',
  Email: '',
  Type: 'shipping', // optional if your API expects it
})

// Address modal state (used in template)
const submitting = ref(false)
const isEdit = computed(() => form.id !== null)


const resetBelowCountry = () => {
  form.Region_Id = ''
  form.District_Id = ''
  form.City_Id = ''
  regions.value = []
  districts.value = []
  cities.value = []
}


const resetBelowRegion = () => {
  form.District_Id = ''
  form.City_Id = ''
  districts.value = []
  cities.value = []
}

const resetBelowDistrict = () => {
  form.City_Id = ''
  cities.value = []
}

const newAddress = reactive({
  Country_Id: '', State_Id: '', City_Id: '',
  Region_Id: '', District_Id: '', Contact_Person_Name: '',
  Telephone_Country_Code: '+968', Telephone: '', Designation: '', Remarks: '',
})

const isDefaultAddress = (address: any) => Boolean(address?.is_default || address?.Is_Default)

const fetchAddresses = async () => {
  if (!isAuthenticated.value) return

  try {
    const res = await $axios.get('/api/contacts')
    addresses.value = res.data
    const stored = import.meta.client ? localStorage.getItem('selected_address_id') : null
    const defaultAddress = addresses.value.find(isDefaultAddress)
    const storedAddress = stored
      ? addresses.value.find(address => Number(address.id) === Number(stored))
      : null
    const candidate = defaultAddress?.id ?? storedAddress?.id ?? addresses.value[0]?.id
    cart.selectedAddressId = candidate ? Number(candidate) : null
  } catch (e) {
    console.error('Failed to fetch addresses', e)
  }
}

// Totals (+5% VAT)
const originalSubtotal = computed(() => + cart.totalOriginalPrice().toFixed(3))
const productDiscount = computed(() => + cart.totalDiscount().toFixed(3))
const subtotal = computed(() => + cart.totalPrice().toFixed(3))
const shippingCost = computed(() =>
  cart.deliveryMethod === 'ship' && selectedOption.value
    ? Number(selectedOption.value.total_price)
    : 0
)
const vat = computed(() => +(((subtotal.value + shippingCost.value) * cart.vat)).toFixed(3))


const grandTotal = computed(() =>
  +(subtotal.value + shippingCost.value + vat.value).toFixed(3)
)

// Qty handlers, address helpers (unchanged)
const runCartMutation = async (action: () => Promise<void>) => {
  if (cartActionBlocked.value) return
  if (!(await ensurePendingRecoveryBeforeCartAction())) return
  cartMutationInFlight.value = true
  quantityMutationError.value = ''
  clearShippingQuotes()
  selectedOptionKey.value = null
  try {
    await action()
  } finally {
    cartMutationInFlight.value = false
  }
}

const runQuantityMutation = async (action: () => Promise<void>) => {
  if (cartMutationInFlight.value || pendingRecoveryBlocked.value) return
  if (!(await ensurePendingRecoveryBeforeCartAction())) return

  quantityMutationError.value = ''
  clearShippingQuotes()
  selectedOptionKey.value = null

  // The store updates the displayed quantity synchronously, then serializes
  // and coalesces the authenticated API writes in the background.
  void action().catch((error: any) => {
    quantityMutationError.value =
      error?.response?.data?.message || t('cart.quantityUpdateError')
  })
}

const onQtyInputChange = async (e: Event, id: number) => {
  const v = (e.target as HTMLInputElement).valueAsNumber
  if (v > 0) await runQuantityMutation(() => cart.updateQuantity(id, v))
}

const incrementQty = async (id: number) => await runQuantityMutation(() => cart.incrementQty(id))
const decrementQty = async (id: number) => await runQuantityMutation(() => cart.decrementQty(id))

const loadCountries = async () => {
  try {
    const res = await $axios.get('/api/countries')
    countries.value = res.data
  } catch (e) { console.error(e) }
}

const loadTitles = async () => {
  try {
    const res = await $axios.get('/api/titles')
    titles.value = Array.isArray(res.data) ? res.data : []
  } catch (e) { console.error(e) }
}

// Localized title for an address row (fallback to legacy Designation text for old rows)
const contactTitle = (a: any) => {
  const match = a?.Title_Id ? titles.value.find(ti => Number(ti.id) === Number(a.Title_Id)) : null
  if (match) return field(match, 'Title_Name')
  return a?.title_name || a?.Designation || ''
}
 


const loadRegionsByCountry = async (countryId: number | string) => {
  regions.value = []
  if (!countryId) return
  const res = await $axios.get(`/api/regions/by-country/${countryId}`)
  regions.value = res.data
}

const loadDistrictsByRegion = async (regionId: number | string) => {
  districts.value = []
  if (!regionId) return
  const res = await $axios.get(`/api/districts/by-region/${regionId}`)
  districts.value = res.data
}

const loadCitiesByDistrict = async (districtId: number | string) => {
  cities.value = []
  if (!districtId) return
  const res = await $axios.get(`/api/cities/by-district/${districtId}`)
  cities.value = res.data
}

// hooked to your <select @change="...">
const onCountryChange = async () => {
  resetBelowCountry()
  if (!form.Country_Id) return
  await loadRegionsByCountry(form.Country_Id)
}

const onRegionChange = async () => {
  resetBelowRegion()
  if (!form.Region_Id) return
  await loadDistrictsByRegion(form.Region_Id)
}

const onDistrictChange = async () => {
  resetBelowDistrict()
  if (!form.District_Id) return
  await loadCitiesByDistrict(form.District_Id)
}


const submitAddress = async () => {
  submitting.value = true
  try {
    await $axios.post('/api/contacts', {
      Country_Id: form.Country_Id || null,
      Region_Id: form.Region_Id || null,
      District_Id: form.District_Id || null,
      City_Id: form.City_Id || null,
      Contact_Person_Name: form.Contact_Person_Name || null,
      Telephone_Country_Code: form.Telephone_Country_Code || null,
      Telephone: digitsOnly(form.Telephone) || null,
      Title_Id: form.Title_Id ? Number(form.Title_Id) : null,
      Remarks: form.Remarks || null,
      Email: form.Email || null,
      Type: form.Type || null,
    })

    showAddressModal.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to save address', e)

  } finally {
    submitting.value = false
  }
}

const cleanTelephone = () => {
  form.Telephone = digitsOnly(form.Telephone)
}

// Modal helpers
const closeModal = () => {
  showAddressModal.value = false
}

const onClearCart = async () => {
  await runCartMutation(() => cart.clearCart())
}

const onRemoveItem = async (id: number) => {
  await runCartMutation(() => cart.removeFromCart(id))
}


watch(() => cart.selectedAddressId, (id) => {
  if (!isClient) return
  if (id) localStorage.setItem('selected_address_id', String(id))
  else localStorage.removeItem('selected_address_id')
}, { immediate: true })



watch(() => cart.selectedLocationId, (id) => {
  if (!isClient) return
  if (id) localStorage.setItem('selected_location_id', String(id))
  else localStorage.removeItem('selected_location_id')
}, { immediate: true })

// --- PERSIST CHECKOUT SELECTION & TOTALS ---
const persistCheckout = () => {
  if (
    !import.meta.client
    || pendingRecoveryBlocked.value
    || pendingCheckoutIdentityFromRaw(localStorage.getItem(AMWAL_PENDING_ORDER_KEY))
    || amwalCheckoutReconciliation.read()
    || !shouldPersistCheckout(cart.cartItems)
  ) return false

  const isShip = cart.deliveryMethod === 'ship'
  const isPickup = cart.deliveryMethod === 'pickup'
  const quotedAt = new Date()
  const expiresAt = new Date(quotedAt.getTime() + SHIPPING_QUOTE_TTL_MS)

  const payload = {
    idempotencyKey: ensureCheckoutIdempotencyKey(),
    deliveryMethod: cart.deliveryMethod,  // ship | pickup

    // ✅ Only one of these should be set based on deliveryMethod
    addressId: isShip ? (cart.selectedAddressId ?? null) : null,
    locationId: isPickup ? (cart.selectedLocationId ?? null) : null,

    // ✅ Only store shipping option if ship
    shippingOption: isShip && selectedOption.value ? {
      shipper_id: selectedOption.value.shipper_id,
      destination_id: selectedOption.value.destination_id,
      basis: selectedOption.value.basis,
      currency: selectedOption.value.currency ?? 'OMR',
      total_price: Number(selectedOption.value.total_price),
      breakdown: selectedOption.value.breakdown ?? null,
      shipper_name: selectedOption.value.shipper_name ?? null, // helpful for summary
      quoted_at: quotedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    } : null,

    totals: {
      currency: 'OMR',
      original_subtotal: +originalSubtotal.value.toFixed(3),
      product_discount: +productDiscount.value.toFixed(3),
      subtotal: +subtotal.value.toFixed(3),
      shipping: +shippingCost.value.toFixed(3),
      vat: +vat.value.toFixed(3),
      grand: +grandTotal.value.toFixed(3),
    },

    items: cart.cartItems.map(i => ({
      id: i.id,
      slug: i.slug,
      qty: i.quantity,
      // Effective unit price: bulk-tier price when a tier matches the quantity (tier wins,
      // no discount stacking), otherwise the normal (possibly discounted) price.
      price: cart.effectiveUnitPrice(i),
      original_price: i.originalPrice ?? i.price,
      discount_amount: cart.hasBulkPricing(i) ? 0 : (i.discountAmount ?? 0),
      active_discount: cart.hasBulkPricing(i) ? null : (i.activeDiscount ?? null),
      has_bulk_price: cart.hasBulkPricing(i),
      bulk_tier: cart.bulkTierFor(i),
    })),

    savedAt: new Date().toISOString(),
  }

  localStorage.setItem('checkout_prefill', JSON.stringify(payload))
  return true
}




const selectedPickupLocation = computed(() =>
  locations.value.find(l => l.id === cart.selectedLocationId) || null
)






const router = useRouter()
const goCheckout = async () => {
  if (cartActionBlocked.value || quotesLoading.value) return
  if (!(await ensurePendingRecoveryBeforeCartAction())) return
  if (!persistCheckout()) return
  router.push('/cart/checkout')
}

onMounted(async () => {
  amwalTabLease.start()
  window.addEventListener('storage', handlePendingAmwalStorage)

  pendingAmwalCheckout.value = pendingCheckoutIdentityFromRaw(
    localStorage.getItem(AMWAL_PENDING_ORDER_KEY),
  )

  const recoveryOutcome = await recoverPendingAmwalCheckout()
  if (recoveryOutcome === 'redirected') return
  if (recoveryOutcome !== 'restored') await cart.loadCart()

  await cart.getVat()


  await fetchLocations();



  const storedLoc = import.meta.client ? localStorage.getItem('selected_location_id') : null
const locCandidate = storedLoc ? Number(storedLoc) : locations.value[0]?.id
if (locCandidate) cart.selectedLocationId = locCandidate


  watch(
    [
      () => cart.deliveryMethod,
      () => cart.selectedAddressId,
      selectedOption,
      subtotal,
      shippingCost,
      vat,
      grandTotal,
      () => cart.cartItems,
      () => pendingRecoveryState.value,
    ],
    persistCheckout,
    { deep: true, immediate: true }
  )

  if (isAuthenticated.value === true) {
    await fetchAddresses()
    await loadCountries()
    await loadTitles()
  }
})

onBeforeUnmount(() => {
  if (externalRecoveryTimer !== null) window.clearTimeout(externalRecoveryTimer)
  externalRecoveryTimer = null
  if (shippingQuoteTimer !== null) window.clearTimeout(shippingQuoteTimer)
  shippingQuoteTimer = null
  amwalTabLease.stop()
  window.removeEventListener('storage', handlePendingAmwalStorage)
})
</script>


<template>
  <section class="bg-white py-6 sm:py-10 px-4 max-w-screen-xl mx-auto font-sans">
    <!-- Two-column layout only on lg+ so the right card aligns with the title -->
    <div class="lg:grid lg:grid-cols-3 lg:gap-6">

      <!-- LEFT: Header + Products -->
      <div class="lg:col-span-2">
        <!-- Header lives in the left column to align the right card with it -->
        <header class="mb-4 sm:mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{{ t('cart.yourCart') }}</h1>
          <div class="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            {{ t('cart.itemsCount', { count: cart.cartItems.length }) }}
            <NuxtLink to="/" class="mx-2 text-[#2f5fb6] hover:underline">{{ t('cart.continueShopping') }}</NuxtLink>
          </div>
        </header>

        <!-- Items Card -->
        <div class="rounded-xl ring-1 ring-gray-200/80 shadow-sm overflow-hidden">
          <!-- Top bar -->
          <div class="flex items-center justify-between px-3 sm:px-5 py-3 bg-gray-50/80 border-b">
            <h2 class="text-sm sm:text-base font-semibold text-gray-800">{{ t('cart.itemsInCart') }}</h2>
            <button
              type="button"
              @click="onClearCart"
              :disabled="cartActionBlocked || pendingRecoveryBlocked"
              :aria-label="buttonLabel(t('cart.clearLabel'), t(cart.cartItems.length === 1 ? 'common.item' : 'common.items', { count: cart.cartItems.length }))"
              class="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition">
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ t('cart.clear') }}
            </button>
          </div>



          <!-- Line items -->
          <div
            v-if="pendingRecoveryState === 'restoring'"
            role="status"
            aria-live="polite"
            class="m-3 rounded-lg border border-slate-200 bg-slate-50 px-5 py-6 text-slate-700 sm:m-5"
          >
            <div class="flex items-center gap-3">
              <svg aria-hidden="true" class="h-5 w-5 shrink-0 animate-spin text-[#00bfa5]" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p class="text-sm font-medium">{{ t('cart.paymentRecoveryRestoring') }}</p>
            </div>
          </div>
          <div
            v-else-if="['error', 'external'].includes(pendingRecoveryState)"
            role="alert"
            class="m-3 rounded-lg border border-red-200 bg-red-50 px-5 py-6 text-red-800 sm:m-5"
          >
            <p class="text-sm leading-6">{{ t(pendingRecoveryState === 'external' ? 'cart.paymentRecoveryExternal' : 'cart.paymentRecoveryError') }}</p>
            <button
              type="button"
              class="mt-3 inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              :disabled="pendingRecoveryState === 'restoring'"
              @click="retryPendingRecovery"
            >
              {{ t('cart.paymentRecoveryRetry') }}
            </button>
          </div>
          <div v-else-if="!cart.cartItems.length" role="status" class="px-5 py-10 text-center text-gray-600">
            {{ t('cart.empty') }}
          </div>
          <template v-else>
          <div
            v-if="quantityMutationError"
            role="alert"
            class="m-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:m-5"
          >
            {{ quantityMutationError }}
          </div>
          <p class="sr-only" role="status" aria-live="polite">
            {{ cart.quantitySyncPending ? t('cart.updatingCart') : '' }}
          </p>
          <div v-for="item in cart.cartItems" :key="item.id"
            class="px-3 sm:px-5 py-3 sm:py-4 border-b last:border-b-0 bg-white/90">
            <div class="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[84px_1fr_auto] gap-3 sm:gap-4 items-start">
              <!-- image -->
              <NuxtLink :to="`/product/${item.slug}`" class="block rounded-lg overflow-hidden ring-1 ring-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" :aria-label="t('listing.viewProduct', { name: productName(item) })">
                <img :src="`${$r2Url}/${item.image}`" :alt="productName(item)" class="w-16 h-16 sm:w-20 sm:h-20 object-cover" />
              </NuxtLink>

              <!-- info -->
              <div class="min-w-0">
                <h3 class="text-sm sm:text-base font-medium text-gray-900 truncate">{{ productName(item) }}</h3>
                <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Item #{{ item.id }}</p>
                <button
                  type="button"
                  @click.prevent="onRemoveItem(item.id)"
                  :disabled="cartActionBlocked"
                  :aria-label="t('cart.removeItem', { name: productName(item) })"
                  class="mt-1.5 text-xs text-[#00bfa5] hover:underline">
                  {{ t('cart.remove') }}
                </button>
              </div>

              <!-- qty + price -->
              <div class="text-right">
                <label class="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1" :for="`cart-qty-${item.id}`">{{ t('cart.qty') }}</label>
                <div
                  class="flex items-center justify-end gap-1"
                  role="group"
                  :aria-busy="cart.isQuantitySyncing(item.id)"
                  :aria-label="t('cart.quantityFor', { name: productName(item) })"
                >
	                  <button
	                    type="button"
	                    @click="decrementQty(item.id)"
	                    :disabled="cartMutationInFlight || pendingRecoveryBlocked || Number(item.quantity || 1) <= 1"
	                    class="h-7 w-7 grid place-items-center bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
	                    :aria-label="quantityButtonLabel('decrease', productName(item), Number(item.quantity || 1) - 1, locale)">−</button>
                  <input :id="`cart-qty-${item.id}`" type="number" min="1" v-model.number="item.quantity"
                    @change="onQtyInputChange($event, item.id)" class="w-14 h-7 border rounded-md text-center text-sm"
                     :max="item.Product_Stock"
                    readonly :aria-describedby="`cart-qty-${item.id}-hint`" />
	                  <button
	                    type="button"
	                    @click="incrementQty(item.id)"
	                    :disabled="cartMutationInFlight || pendingRecoveryBlocked || Number(item.quantity || 0) >= Number(item.Product_Stock || 0)"
	                    class="h-7 w-7 grid place-items-center bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
	                    :aria-label="quantityButtonLabel('increase', productName(item), Number(item.quantity || 1) + 1, locale)">+</button>
                </div>
                <p :id="`cart-qty-${item.id}-hint`" class="sr-only">{{ t('cart.quantityHint') }}</p>
                <p class="text-xs sm:text-sm text-emerald-700 font-semibold mt-1.5">
                  {{ t('common.omr') }} {{ cart.effectiveUnitPrice(item).toFixed(3) }}
                  <span class="text-[10px] sm:text-xs text-gray-500 font-normal">/ {{ t('product.each') }}</span>
                </p>
                <!-- Bulk tier wins: show badge + struck base price, no product-discount lines -->
                <template v-if="cart.hasBulkPricing(item)">
                  <span class="mt-1 inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 ring-1 ring-cyan-200">
                    {{ t('cart.bulkPrice') }}
                  </span>
                  <p v-if="cart.effectiveUnitPrice(item) < Number(item.originalPrice || item.price || 0)" class="text-[11px] text-gray-400 line-through">
                    {{ t('common.omr') }} {{ Number(item.originalPrice || item.price || 0).toFixed(3) }}
                  </p>
                </template>
                <template v-else>
                  <p v-if="item.hasDiscount" class="text-[11px] text-gray-400 line-through">
                    {{ t('common.omr') }} {{ Number(item.originalPrice || item.price || 0).toFixed(3) }}
                  </p>
                  <p v-if="item.hasDiscount" class="text-[11px] text-emerald-700">
                    {{ t('listing.saveAmount', { amount: Number(item.discountAmount || 0).toFixed(3) }) }} / {{ t('product.each') }}
                  </p>
                </template>
              </div>
            </div>
          </div>
          </template>
        </div>
      </div>

      <!-- RIGHT: Summary (aligned with the title on lg+) -->
      <aside class="mt-6 lg:mt-0 lg:col-span-1 lg:self-start">
        <div class="w-full rounded-xl ring-1 ring-gray-200 shadow-sm bg-white p-4 sm:p-5 lg:sticky space-y-4"
          style="top: var(--app-header-h, 1.5rem);">
          <!-- Delivery -->
          <details class="lg:open" open>
            <summary class="list-none cursor-pointer flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">{{ t('cart.delivery') }}</h3>
              <span class="lg:hidden text-xs text-gray-500">{{ t('cart.tapToExpand') }}</span>
            </summary>
            <div class="mt-2 space-y-2">
              <label class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm"
                :class="cart.deliveryMethod === 'ship' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'">
                <input type="radio" value="ship" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
                {{ t('cart.shipToAddress') }}
              </label>
              <label class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm"
                :class="cart.deliveryMethod === 'pickup' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'">
                <input type="radio" value="pickup" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
                {{ t('cart.localPickup') }}
              </label>
            </div>
          </details>

          <details v-if="cart.deliveryMethod === 'pickup'" class="lg:open" open>
            <summary class="list-none cursor-pointer mt-1 flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">{{ t('cart.locations') }}</h3>
            </summary>
            <div class="mt-2">
              <div v-if="!isAuthenticated" class="text-sm text-gray-600">
                {{ t('cart.loginToSelectLocation') }}
              </div>

              <template v-else>
                <div v-if="locations.length" class="space-y-2">
                  <select v-model="cart.selectedLocationId"
                    :aria-label="t('cart.selectPickupLocation')"
                    class="w-full rounded-md border border-slate-300 px-3 py-2 bg-white text-sm">
                    <option v-for="location in locations" :key="location.id" :value="location.id">
                      {{ field(location, 'Location_Name') }}
                    </option>
                  </select>

                </div>
                <div v-else class="text-sm text-gray-600">
                  {{ t('cart.noAddresses') }}
	                  <button type="button" @click="showAddressModal = true" class="text-teal-700 hover:underline font-medium">
                    {{ t('cart.addOne') }}
                  </button>
                </div>
              </template>
            </div>
          </details>




          <!-- Address -->
          <details v-if="cart.deliveryMethod === 'ship'" class="lg:open" open>
            <summary class="list-none cursor-pointer mt-1 flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">{{ t('cart.shippingAddress') }}</h3>
            </summary>
            <div class="mt-2">
              <div v-if="!isAuthenticated" class="text-sm text-gray-600">
                {{ t('cart.loginToSelectAddress') }}
              </div>

              <template v-else>
                <div v-if="addresses.length" class="space-y-2">
                  <select v-model="cart.selectedAddressId"
                    :aria-label="t('cart.selectShippingAddress')"
                    class="w-full rounded-md border border-slate-300 px-3 py-2 bg-white text-sm">
                    <option v-for="a in addresses" :key="a.id" :value="a.id">
                      {{ isDefaultAddress(a) ? `${t('cart.defaultAddress')} - ` : '' }}{{ [contactTitle(a), a.Contact_Person_Name].filter(Boolean).join(' ') }} — {{ formatPhone(a.Telephone_Country_Code, a.Telephone) }} — {{ field(a.country, 'Country_Name') }}, {{ field(a.city, 'City_Name') }}
                    </option>
                  </select>
                  <button type="button" @click="showAddressModal = true" class="text-xs text-teal-700 hover:underline">
                    {{ t('cart.addNewAddress') }}
                  </button>
                </div>
                <div v-else class="text-sm text-gray-600">
                  {{ t('cart.noAddresses') }}
	                  <button type="button" @click="showAddressModal = true" class="text-teal-700 hover:underline font-medium">
                    {{ t('cart.addOne') }}
                  </button>
                </div>
              </template>
            </div>
          </details>

          <!-- Shipping options -->
          <details v-if="cart.deliveryMethod === 'ship' && cart.selectedAddressId" class="lg:open" open>
            <summary class="list-none cursor-pointer mt-1 flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">{{ t('cart.deliveryOptions') }}</h3>
	              <span v-if="quotesLoading" role="status" class="text-[11px] text-gray-500">{{ t('cart.calculating') }}</span>
            </summary>
            <div class="mt-2" role="radiogroup" :aria-label="t('cart.shippingOptionsGroup')">
	              <div v-if="!quotesLoading && shippingOptions.length === 0" role="status" class="text-xs text-gray-500">
                {{ t('cart.noDeliveryOptions') }}
              </div>

          
              <div v-for="opt in shippingOptions" :key="optionKey(opt)"
                class="mt-2 p-3 rounded-md border bg-white flex items-center justify-between text-sm"
                :class="selectedOptionKey === optionKey(opt) ? 'border-teal-500' : 'border-slate-200'">
                <label class="flex items-center gap-3 cursor-pointer">
	                  <input type="radio" name="shipOpt" :value="optionKey(opt)" v-model="selectedOptionKey"
	                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-cyan-500" />
                    <div><img :src="`${$r2Url}/${opt.shipper_image}`" :alt="opt.shipper_name"  style="width: 40px; height: 40px;"/></div>
                  <div class="font-medium">{{ opt.shipper_name }}</div>
                </label>

                <div class="font-semibold text-[#00bfa5]">
                  {{ opt.currency }} {{ opt.total_price }}
                </div>
              </div>

            </div>
          </details>

          <!-- Totals -->
          <div class="pt-2 border-t">
            <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-2">{{ t('cart.summary') }}</h3>
            <div class="space-y-1.5 text-sm">
              <div v-if="productDiscount > 0" class="flex justify-between text-gray-500">
                <span>{{ t('cart.itemsBeforeDiscount') }}</span><span>{{ t('common.omr') }} {{ originalSubtotal.toFixed(3) }}</span>
              </div>
              <div v-if="productDiscount > 0" class="flex justify-between text-emerald-700">
                <span>{{ t('cart.productDiscount') }}</span><span>- {{ t('common.omr') }} {{ productDiscount.toFixed(3) }}</span>
              </div>
              <div class="flex justify-between"><span>{{ t('product.subTotal') }}</span><span>{{ t('common.omr') }} {{ subtotal.toFixed(3) }}</span></div>
              <div class="flex justify-between"><span>{{ t('nav.shipping') }}</span><span>{{ t('common.omr') }} {{ shippingCost.toFixed(3) }}</span>
              </div>
              <div class="flex justify-between"><span>VAT ({{ (cart.vat * 100).toFixed(1) }}%)</span><span>{{ t('common.omr') }} {{
                vat.toFixed(3)
                  }}</span></div>
            </div>
            <hr class="my-3" />
            <div class="flex justify-between font-semibold text-base sm:text-lg text-[#00bfa5]">
              <span>{{ t('cart.total') }}</span>
              <span>{{ t('common.omr') }} {{ grandTotal.toFixed(3) }}</span>
            </div>

            <button type="button" @click="goCheckout" class="mt-3 sm:mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135]
                     text-white text-center font-semibold py-2.5 rounded-md shadow transition disabled:opacity-60"
              :disabled="pendingRecoveryBlocked || cartActionBlocked || quotesLoading || cart.cartItems.length === 0 || (cart.deliveryMethod === 'ship' && !selectedOption)">
              {{ cart.quantitySyncPending ? t('cart.updatingCart') : t('cart.proceedToCheckout') }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile sticky bar (unchanged) -->
    <div
      class="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-6px_16px_rgba(15,23,42,0.05)]"
      v-if="cart.cartItems.length">
      <div class="flex items-center justify-between">
        <div class="text-sm">
          <div class="text-slate-500">{{ t('cart.total') }}</div>
          <div class="font-semibold text-slate-900">{{ t('common.omr') }} {{ grandTotal.toFixed(3) }}</div>
        </div>
        <button type="button" @click="goCheckout" class="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white
                 bg-[#2f5fb6] hover:bg-[#274f97] transition disabled:bg-gray-300"
          :disabled="pendingRecoveryBlocked || cartActionBlocked || quotesLoading || cart.cartItems.length === 0 || (cart.deliveryMethod === 'ship' && !selectedOption)">
          {{ cart.quantitySyncPending ? t('cart.updatingCart') : t('cart.checkout') }}
        </button>
      </div>
      <div class="h-[env(safe-area-inset-bottom)]"></div>
    </div>
  </section>

  <!-- Address Modal (unchanged content) -->
  <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="showAddressModal" class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @keydown.esc.prevent.stop="showAddressModal = false">
      <div class="absolute inset-0 bg-black/40" @click="showAddressModal = false"></div>

      <Transition enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
        enter-to-class="opacity-100 translate-y-0 sm:scale-100" leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95">
        <div v-show="showAddressModal"
          class="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5" role="dialog"
          aria-modal="true">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 class="text-lg font-semibold">{{ t('cart.addNewAddress') }}</h3>
	            <button type="button" @click="showAddressModal = false"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              :aria-label="t('common.close')">
              ✕
            </button>
          </div>

          <!-- Body (unchanged form) -->
          <form @submit.prevent="submitAddress" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Country -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.country') }}</label>
              <div class="relative">
                <select v-model="form.Country_Id" @change="onCountryChange" :class="selectCls">
                  <option value="">{{ t('addresses.selectCountry') }}</option>
                  <option v-for="c in countries" :key="c.id" :value="c.id">{{ field(c, 'Country_Name') }}</option>
                </select>
                <ChevronDown />
              </div>
            </div>

            <!-- Region -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.region') }}</label>
              <div class="relative">
                <select v-model="form.Region_Id" @change="onRegionChange" :class="selectCls">
  <option value="">{{ t('addresses.selectRegion') }}</option>
  <option v-for="r in regions" :key="r.id" :value="r.id">{{ field(r, 'Region_Name') }}</option>
</select>
                <ChevronDown />
              </div>
            </div>

            <!-- District -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.district') }}</label>
              <div class="relative">
                <select v-model="form.District_Id" @change="onDistrictChange" :class="selectCls">
  <option value="">{{ t('addresses.selectDistrict') }}</option>
  <option v-for="d in districts" :key="d.id" :value="d.id">{{ field(d, 'District_Name') }}</option>
</select>
                <ChevronDown />
              </div>
            </div>

            <!-- City -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.city') }}</label>
              <div class="relative">
                <select v-model="form.City_Id" :class="selectCls">
  <option value="">{{ t('addresses.selectCity') }}</option>
  <option v-for="ci in cities" :key="ci.id" :value="ci.id">{{ field(ci, 'City_Name') }}</option>
</select>
                <ChevronDown />
              </div>
            </div>

            <!-- Title -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.contactTitle') }}</label>
              <div class="relative">
                <select v-model="form.Title_Id" :class="selectCls">
                  <option value="">{{ t('addresses.selectTitle') }}</option>
                  <option v-for="ti in titles" :key="ti.id" :value="ti.id">{{ field(ti, 'Title_Name') }}</option>
                </select>
                <ChevronDown />
              </div>
            </div>

            <!-- Contact Person -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.contactPerson') }}</label>
              <input v-model.trim="form.Contact_Person_Name" :class="inputCls" type="text" />
            </div>

            <!-- Telephone -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.telephone') }}</label>
              <div class="grid grid-cols-[120px_1fr] gap-2">
                <div class="relative">
                  <select v-model="form.Telephone_Country_Code" :class="selectCls">
                    <option v-for="item in phoneCountryCodes" :key="item.code" :value="item.code">
                      {{ item.code }}
                    </option>
                  </select>
                  <ChevronDown />
                </div>
                <input
                  v-model.trim="form.Telephone"
                  :class="inputCls"
                  type="tel"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="9XXXXXXX"
                  @input="cleanTelephone"
                />
              </div>
            </div>

            <!-- Email -->
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.email') }}</label>
              <input v-model.trim="form.Email" :class="inputCls" type="email" />
            </div>

            <!-- Remarks -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('addresses.remarks') }}</label>
              <textarea v-model.trim="form.Remarks" :class="textareaCls" rows="3"></textarea>
            </div>

            <!-- Footer -->
            <div class="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" @click="closeModal"
                class="px-4 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50">
                {{ t('common.cancel') }}
              </button>
              <button type="submit"
                class="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
                :disabled="submitting">
                <span v-if="submitting"
                  class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                {{ isEdit ? t('addresses.saveChanges') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
