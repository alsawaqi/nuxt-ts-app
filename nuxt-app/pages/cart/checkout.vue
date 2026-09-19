<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  middleware: 'auth',
})

import { useCartStore } from '~/stores/cart'
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useOrderConfirmPdf } from '@/composables/useOrderConfirmPdf'
import { useLoyaltyStore } from '~/stores/loyalty'
import { fieldA11y } from '~/utils/accessibility.js'
import { formatBulkTierRange } from '~/utils/bulkPricing.js'
import {
  cartRestorationIsSafe,
  checkoutItemsMatch,
  checkoutStateOwnership,
  deriveCheckoutTotals,
  legacyCheckoutMigrationOwner,
  pendingCheckoutBelongsToTab,
  pendingCheckoutIdentityMatches,
  reconcileCheckoutTotals,
} from '~/utils/checkoutState.js'

// import { useToast } from 'vue-toastification'

const { user, isAuthenticated } = useAuth()
const { $axios, $r2Url } = useNuxtApp()
const { formatPhone } = usePhoneCountryCodes()
const { t, field, productName, locale } = useStorefrontLocale()
const { open: openAmwalSmartBox } = useAmwalSmartBox()
const amwalCheckoutReconciliation = useAmwalCheckoutReconciliation()
const amwalTabLease = useAmwalCheckoutTabLease()

const step = ref<'confirm' | 'payment'>('confirm')

const { buildPdfUrl } = useOrderConfirmPdf()

const pdfUrl = ref<string>('')
const isOrderPlaced = ref(false)
type AmwalPhase = 'idle' | 'opening' | 'awaiting' | 'verifying' | 'pending' | 'cancelling' | 'failed' | 'cancelled' | 'paid'
interface PendingAmwalOrder {
  orderId: number
  orderCode: string | null
  checkoutKey?: string
  amount?: number
  currency?: string
  summary?: Record<string, any>
  ownerTabId?: string
}

const AMWAL_PENDING_ORDER_KEY = 'amwal_pending_order'
const AMWAL_FORCE_FRESH_KEY = 'amwal_force_fresh_checkout_key'
const amwalPhase = ref<AmwalPhase>('idle')
const amwalMessage = ref('')
const pendingAmwalOrder = ref<PendingAmwalOrder | null>(null)
const placedOrderResponse = ref<any>(null)
const amwalVerificationInFlight = ref(false)
const orderFinalizationInFlight = ref(false)
const pendingCancellationInFlight = ref(false)
const amwalCallbackInFlight = ref(false)
const pendingOrderDetails = ref<any>(null)
const pendingIdentityVerified = ref(false)
const currentCheckoutReconciled = ref(false)

const currentAmwalTabId = amwalTabLease.currentTabId

const onPrintPdf = () => {
  if (!pdfUrl.value) return
  if (!import.meta.client) return
  const w = window.open(pdfUrl.value, '_blank')
  w?.focus?.()
  w?.print?.()
}

// ---------------------
// Types
// ---------------------
type Basis = 'weight' | 'volume' | 'heavy'

interface SavedShippingOption {
  shipper_id: number
  destination_id: number
  basis: Basis
  currency: string
  total_price: number
  breakdown?: any | null
  shipper_name?: string | null
  quoted_at?: string | null
  expires_at?: string | null
}
interface SavedCheckoutPrefill {
  idempotencyKey?: string
  orderRef?: string
  deliveryMethod: 'ship' | 'pickup'
  addressId: number | null
  locationId: number | null     // ✅ ADD THIS
  shippingOption: SavedShippingOption | null
  totals: {
    currency: string
    original_subtotal?: number
    product_discount?: number
    subtotal: number
    shipping: number
    vat: number
    before_loyalty?: number
    loyalty_discount?: number
    grand: number
  }
  items: { id: number; vendor_offer_id?: number | null; slug?: string; qty: number; price: number; original_price?: number; discount_amount?: number; active_discount?: any | null }[]
  savedAt: string
}

interface Cod {
    cod_supported : boolean
}

interface LoyaltySummary {
  available_points: number
  points_earned: number
  points_redeemed: number
  redeem_points: number
  redeem_amount: number
  redemption_value_per_point: number
}

// ---------------------
// State
// ---------------------
const cart = useCartStore()
const loyaltyStore = useLoyaltyStore()
//const toast = useToast()

const isSubmitting = ref(false)
const isSuccess = ref(false)
const itemsOpen = ref(false)
const codsupported = ref<Cod | null>(null)
const loyaltySummary = ref<LoyaltySummary | null>(null)
const loyaltyLoading = ref(false)
const useLoyaltyPoints = ref(false)
const loyaltyPointsToRedeem = ref<number>(0)
const amwalOperationInFlight = computed(() => Boolean(
  isSubmitting.value
  || amwalVerificationInFlight.value
  || orderFinalizationInFlight.value
  || pendingCancellationInFlight.value
  || amwalCallbackInFlight.value,
))

const selectedAddress = ref<any>(null)
const saved = ref<SavedCheckoutPrefill | null>(null)
const CHECKOUT_IDEMPOTENCY_KEY = 'checkout_idempotency_key'
const CHECKOUT_IDEMPOTENCY_SIGNATURE = 'checkout_idempotency_signature'

const readStoredCheckoutPrefill = (): SavedCheckoutPrefill | null => {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem('checkout_prefill')
    return raw ? JSON.parse(raw) as SavedCheckoutPrefill : null
  } catch {
    return null
  }
}

const checkoutStateIsOwnedBy = (ownerKey?: string | null) => {
  if (!import.meta.client || !ownerKey) return false
  const persistedPrefill = readStoredCheckoutPrefill()
  const ownership = checkoutStateOwnership({
    ownerKey,
    storedKey: localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY),
    prefillKey: persistedPrefill?.idempotencyKey,
  })
  return ownership.ownsStoredKey && ownership.ownsPrefill
}

const clearCheckoutStateIfOwned = (ownerKey?: string | null) => {
  if (!import.meta.client || !ownerKey) {
    return { ownsStoredKey: false, ownsPrefill: false }
  }

  const persistedPrefill = readStoredCheckoutPrefill()
  const ownership = checkoutStateOwnership({
    ownerKey,
    storedKey: localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY),
    prefillKey: persistedPrefill?.idempotencyKey,
  })

  if (ownership.ownsStoredKey) {
    localStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY)
    localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
  }
  if (ownership.ownsPrefill) localStorage.removeItem('checkout_prefill')

  return ownership
}

const makeCheckoutIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

const ensureSavedIdempotencyKey = () => {
  if (!import.meta.client) {
    return saved.value?.idempotencyKey || makeCheckoutIdempotencyKey()
  }

  const key = saved.value?.idempotencyKey
    || localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY)
    || makeCheckoutIdempotencyKey()

  localStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, key)

  if (saved.value && saved.value.idempotencyKey !== key) {
    saved.value.idempotencyKey = key
    localStorage.setItem('checkout_prefill', JSON.stringify(saved.value))
  }

  return key
}


 
// Contact title for display: prefer the DB-driven title name, fallback to legacy Designation text
const contactTitle = (a: any) => a?.title_name || a?.Designation || ''

const shippingAddressText = computed(() => {
  const a = selectedAddress.value
  return a
    ? `${[contactTitle(a), a?.Contact_Person_Name].filter(Boolean).join(' ')}\n${formatPhone(a?.Telephone_Country_Code, a?.Telephone)}\n` +
    `${field(a?.country, 'Country_Name') || ''}, ${field(a?.region, 'Region_Name') || ''}, ` +
    `${field(a?.district, 'District_Name') || ''}, ${field(a?.city, 'City_Name') || ''}`
    : '—'
})

// Bulk tier for a line: resolved client-side for cart items; null for server detail rows
// (their unit_price already carries the tier price and Product_Discount_* is empty).
const lineBulkTier = (item: any) => {
  if (typeof item?.quantity === 'undefined' || typeof item?.price === 'undefined') return null
  return cart.bulkTierFor(item)
}

// Unit price actually charged for a line (tier wins over product discounts, no stacking).
const lineUnitPrice = (item: any): number => {
  if (item?.unit_price !== undefined && item?.unit_price !== null) return Number(item.unit_price)
  if (typeof item?.quantity !== 'undefined' && typeof item?.price !== 'undefined') {
    return cart.effectiveUnitPrice(item)
  }
  return Number(item?.price ?? 0)
}

const invoiceProductDescription = (item: any) => {
  const details = field(item, ['description', 'Product_Description']) || field(item.product, 'Product_Description')
  const bulkTier = lineBulkTier(item)
  const discount = Number(item.discountAmount || item.discount_amount || item.unit_discount_amount || 0)
  const original = Number(item.originalPrice || item.original_price || item.original_unit_price || 0)
  const discountName = item.activeDiscount?.name || item.active_discount?.name || item.discount?.name
  const discountLine = bulkTier
    ? `Bulk price: OMR ${Number(bulkTier.unit_price).toFixed(3)} each (qty ${formatBulkTierRange(bulkTier)})`
    : (discount > 0
      ? `Discount: ${discountName ? `${discountName} - ` : ''}saved OMR ${discount.toFixed(3)} each${original ? ` from OMR ${original.toFixed(3)}` : ''}`
      : '')
  return [productName(item) || item.product_name || t('common.products'), details, discountLine].filter(Boolean).join('\n')
}

const linesForPdf = (items: any[] = cart.cartItems) =>
  items.map((i) => ({
    description: invoiceProductDescription(i),
    qty: Number(i.quantity || i.qty || 0),
    unit: 'EA',
    unitPrice: lineUnitPrice(i),
    vatPct: (() => {
      const explicitRate = Number(i.vat_rate ?? i.vatRate ?? i.Vat_Rate)
      if (Number.isFinite(explicitRate) && explicitRate >= 0) return +explicitRate.toFixed(2)

      const vatAmount = Number(i.vat ?? i.Vat)
      const subtotal = Number(i.subtotal ?? i.Subtotal)
      if (Number.isFinite(vatAmount) && vatAmount >= 0 && Number.isFinite(subtotal) && subtotal > 0) {
        return +((vatAmount / subtotal) * 100).toFixed(2)
      }

      return +(cart.vat * 100).toFixed(2)
    })(),
  }))

// ---------------------
// Payment state
// ---------------------
const paymentMethod = ref<'card' | 'cod' | 'transfer'>('card')
const deliveryMethods =  ref<any>('')
const triedSubmit = ref(false)
const transfer = ref({ reference: '', payerName: '' })
const transferValid = computed(() => Boolean(transfer.value.reference.trim() && transfer.value.payerName.trim()))
// ---------------------
// Load saved prefill + address
// ---------------------
const fetchSelectedAddress = async (addressId: number | null) => {
  if (cart.deliveryMethod !== 'ship' || !addressId) return
  try {
    const res = await $axios.get(`/api/contacts/${addressId}`)
    selectedAddress.value = res.data
  } catch (error) {
    console.error('Failed to fetch selected address:', error)
  }
}

// ---------------------
// Totals (from saved blob; fallback to runtime if needed)
// ---------------------
const savedOriginalSubtotal = computed(() => Number(saved.value?.totals?.original_subtotal ?? cart.totalOriginalPrice().toFixed(3)))
const savedProductDiscount = computed(() => Number(saved.value?.totals?.product_discount ?? cart.totalDiscount().toFixed(3)))
const savedSubtotal = computed(() => Number(saved.value?.totals?.subtotal ?? cart.totalPrice().toFixed(3)))
const savedShippingCost = computed(() => Number(saved.value?.totals?.shipping ?? 0))
const savedVat = computed(() => Number(saved.value?.totals?.vat ?? ((savedSubtotal.value + savedShippingCost.value) * cart.vat)))
const savedGrand = computed(() => Number(saved.value?.totals?.grand ?? (savedSubtotal.value + savedShippingCost.value + savedVat.value)))
const availableLoyaltyPoints = computed(() => Number(loyaltySummary.value?.available_points ?? 0))
const loyaltyValuePerPoint = computed(() => Number(loyaltySummary.value?.redemption_value_per_point ?? 0))
const maxLoyaltyPointsForOrder = computed(() => {
  if (!loyaltyValuePerPoint.value || savedGrand.value <= 0) return 0
  return Math.max(0, Math.floor(savedGrand.value / loyaltyValuePerPoint.value))
})
const maxUsableLoyaltyPoints = computed(() => Math.min(availableLoyaltyPoints.value, maxLoyaltyPointsForOrder.value))
const effectiveLoyaltyPoints = computed(() => {
  if (!useLoyaltyPoints.value || !loyaltyValuePerPoint.value) return 0
  return Math.max(0, Math.min(Math.floor(Number(loyaltyPointsToRedeem.value || 0)), maxUsableLoyaltyPoints.value))
})
const loyaltyDiscount = computed(() => Number(Math.min(effectiveLoyaltyPoints.value * loyaltyValuePerPoint.value, savedGrand.value).toFixed(3)))
const payableGrand = computed(() => Number(Math.max(savedGrand.value - loyaltyDiscount.value, 0).toFixed(3)))
const pendingSnapshot = computed(() => pendingOrderDetails.value || pendingAmwalOrder.value?.summary || null)
const pendingTotals = computed(() => {
  if (!pendingAmwalOrder.value) return null

  const savedTotals = saved.value?.totals || null
  const snapshotTotals = pendingSnapshot.value?.totals || null
  const fallbackGrand = Number(pendingAmwalOrder.value.amount ?? savedTotals?.grand)

  return {
    original_subtotal: Number(snapshotTotals?.original_subtotal ?? savedTotals?.original_subtotal ?? savedTotals?.subtotal ?? 0),
    product_discount: Number(snapshotTotals?.product_discount ?? savedTotals?.product_discount ?? 0),
    subtotal: Number(snapshotTotals?.subtotal ?? savedTotals?.subtotal ?? 0),
    shipping: Number(snapshotTotals?.shipping ?? savedTotals?.shipping ?? 0),
    vat: Number(snapshotTotals?.vat ?? savedTotals?.vat ?? 0),
    loyalty_discount: Number(snapshotTotals?.loyalty_discount ?? savedTotals?.loyalty_discount ?? 0),
    grand_total: Number(snapshotTotals?.grand_total ?? snapshotTotals?.grand ?? fallbackGrand),
  }
})
const pendingSummaryReady = computed(() => Boolean(
  pendingAmwalOrder.value
  && pendingTotals.value
  && ['subtotal', 'shipping', 'vat', 'grand_total'].every((key) => {
    const value = pendingTotals.value?.[key]
    return value !== null && value !== undefined && Number.isFinite(Number(value))
  }),
))
const orderSummaryReady = computed(() => pendingAmwalOrder.value
  ? pendingSummaryReady.value
  : currentCheckoutReconciled.value)
const displayedOriginalSubtotal = computed(() => pendingAmwalOrder.value
  ? Number(pendingTotals.value?.original_subtotal ?? pendingTotals.value?.subtotal ?? 0)
  : savedOriginalSubtotal.value)
const displayedProductDiscount = computed(() => pendingAmwalOrder.value
  ? Number(pendingTotals.value?.product_discount ?? 0)
  : savedProductDiscount.value)
const displayedSubtotal = computed(() => pendingAmwalOrder.value
  ? Number(pendingTotals.value?.subtotal ?? 0)
  : savedSubtotal.value)
const displayedShippingCost = computed(() => pendingAmwalOrder.value
  ? Number(pendingTotals.value?.shipping ?? 0)
  : savedShippingCost.value)
const displayedVat = computed(() => pendingAmwalOrder.value
  ? Number(pendingTotals.value?.vat ?? 0)
  : savedVat.value)
const displayedPayableGrand = computed(() => {
  if (pendingAmwalOrder.value) {
    const detailsAmount = Number(pendingTotals.value?.grand_total)
    if (Number.isFinite(detailsAmount) && detailsAmount >= 0) return detailsAmount
    return 0
  }
  return payableGrand.value
})
const displayedLoyaltyDiscount = computed(() => {
  if (pendingAmwalOrder.value) {
    const authoritative = Number(pendingTotals.value?.loyalty_discount)
    return Number.isFinite(authoritative) && authoritative >= 0 ? authoritative : 0
  }
  return loyaltyDiscount.value
})
const checkoutDisplayItems = computed(() => {
  if (!pendingAmwalOrder.value) return cart.cartItems

  const serverItems = pendingSnapshot.value?.items
  if (Array.isArray(serverItems) && serverItems.length > 0) return serverItems
  if (cart.cartItems.length > 0) return cart.cartItems
  return Array.isArray(saved.value?.items) ? saved.value.items : []
})
const displayItemKey = (item: any) => `${item?.product_id ?? item?.id}:${item?.vendor_offer_id ?? item?.vendorOfferId ?? 'own'}`
const displayItemName = (item: any) => item?.product_name || productName(item)
const displayItemImage = (item: any) => item?.image_path || item?.image || ''
const displayItemQuantity = (item: any) => Number(item?.quantity ?? item?.qty ?? 0)
const pendingFulfillmentText = computed(() => {
  const fulfillment = pendingSnapshot.value?.fulfillment
  if (!fulfillment) return ''
  if (fulfillment.type === 'pickup') return fulfillment.pickup?.location_name || ''
  return fulfillment.shipping?.address || ''
})
const loyaltyRuleLabel = computed(() => {
  const points = Number(loyaltySummary.value?.redeem_points || 0)
  const amount = Number(loyaltySummary.value?.redeem_amount || 0)
  if (!points || !amount) return 'Redemption is not configured yet.'
  return `${points.toLocaleString()} points = OMR ${amount.toFixed(3)}`
})

// For enabling the button (no shipping UI here; we trust saved)

const shippingOk = computed(() => {
 if (cart.deliveryMethod === 'pickup') {
    return Boolean(saved.value?.locationId ?? cart.selectedLocationId)
  }
   return Boolean(saved.value?.addressId && saved.value?.shippingOption)
})
const paymentOk = computed(() => {
  if (payableGrand.value <= 0) return true
  if (paymentMethod.value === 'card') return true
  if (paymentMethod.value === 'transfer') return transferValid.value
  if (paymentMethod.value === 'cod') return true
  return false
})


const canSubmit = computed(() => currentCheckoutReconciled.value && shippingOk.value && paymentOk.value)
const transferInvalid = computed(() => triedSubmit.value && paymentMethod.value === 'transfer' && !transferValid.value)

// ---------------------
// Keep address in sync if method flips
watch(() => cart.deliveryMethod, (val) => {
  if (val !== 'ship') selectedAddress.value = null
  else fetchSelectedAddress(saved.value?.addressId ?? null)
})

watch([useLoyaltyPoints, loyaltyPointsToRedeem, maxUsableLoyaltyPoints], () => {
  if (!useLoyaltyPoints.value) return
  if (loyaltyPointsToRedeem.value < 0) loyaltyPointsToRedeem.value = 0
  if (loyaltyPointsToRedeem.value > maxUsableLoyaltyPoints.value) {
    loyaltyPointsToRedeem.value = maxUsableLoyaltyPoints.value
  }
})


const pickupLocationId = computed(() =>
  cart.deliveryMethod === 'pickup'
    ? (saved.value?.locationId ?? cart.selectedLocationId ?? null)
    : null
)

const fetchLoyaltySummary = async () => {
  loyaltyLoading.value = true
  try {
    const { data } = await $axios.get('/api/loyalty/summary', { withCredentials: true })
    loyaltySummary.value = data
  } catch (error) {
    console.error('Failed to fetch loyalty summary:', error)
  } finally {
    loyaltyLoading.value = false
  }
}

const applyMaxLoyalty = () => {
  if (!maxUsableLoyaltyPoints.value) return
  useLoyaltyPoints.value = true
  loyaltyPointsToRedeem.value = maxUsableLoyaltyPoints.value
}

let amwalCallbackQueue: Promise<void> = Promise.resolve()
let amwalCallbackGeneration = 0
let activeAmwalCallbackIdentity = ''

const amwalIdentityToken = (pending?: PendingAmwalOrder | null) => pending
  ? `${pending.orderId}:${String(pending.checkoutKey || '')}:${String(pending.ownerTabId || '')}`
  : ''

const activateAmwalCallbackGeneration = (pending: PendingAmwalOrder) => {
  const identity = amwalIdentityToken(pending)
  if (identity !== activeAmwalCallbackIdentity) {
    activeAmwalCallbackIdentity = identity
    amwalCallbackGeneration += 1
  }
  return amwalCallbackGeneration
}

const invalidateAmwalCallbackGeneration = (expected?: PendingAmwalOrder | null) => {
  if (expected && activeAmwalCallbackIdentity && activeAmwalCallbackIdentity !== amwalIdentityToken(expected)) return
  activeAmwalCallbackIdentity = ''
  amwalCallbackGeneration += 1
}

const persistPendingAmwalOrder = (
  value: PendingAmwalOrder,
  expectedStored: PendingAmwalOrder | null = pendingAmwalOrder.value,
) => {
  if (import.meta.client) {
    const stored = readPendingAmwalOrder()
    const mayWrite = expectedStored === null
      ? stored === null
      : pendingCheckoutIdentityMatches(expectedStored, stored)
    if (!mayWrite) return false
  }

  pendingAmwalOrder.value = value
  activateAmwalCallbackGeneration(value)
  isOrderPlaced.value = true
  if (import.meta.client) localStorage.setItem(AMWAL_PENDING_ORDER_KEY, JSON.stringify(value))
  return true
}

const readPendingAmwalOrder = (): PendingAmwalOrder | null => {
  if (!import.meta.client) return null
  const raw = localStorage.getItem(AMWAL_PENDING_ORDER_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const orderId = Number(parsed?.orderId)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      if (localStorage.getItem(AMWAL_PENDING_ORDER_KEY) === raw) {
        localStorage.removeItem(AMWAL_PENDING_ORDER_KEY)
      }
      return null
    }
    return {
      orderId,
      orderCode: typeof parsed?.orderCode === 'string' ? parsed.orderCode : null,
      checkoutKey: typeof parsed?.checkoutKey === 'string' ? parsed.checkoutKey : undefined,
      amount: Number.isFinite(Number(parsed?.amount)) && Number(parsed?.amount) >= 0
        ? Number(parsed.amount)
        : undefined,
      currency: typeof parsed?.currency === 'string' ? parsed.currency : undefined,
      summary: parsed?.summary && typeof parsed.summary === 'object' && !Array.isArray(parsed.summary)
        ? parsed.summary
        : undefined,
      ownerTabId: typeof parsed?.ownerTabId === 'string' && parsed.ownerTabId.trim()
        ? parsed.ownerTabId.trim()
        : undefined,
    }
  } catch {
    if (localStorage.getItem(AMWAL_PENDING_ORDER_KEY) === raw) {
      localStorage.removeItem(AMWAL_PENDING_ORDER_KEY)
    }
    return null
  }
}

const claimPendingAmwalOrderForThisTab = (pending: PendingAmwalOrder): PendingAmwalOrder | null => {
  if (!import.meta.client) return null
  const tabId = currentAmwalTabId()
  if (!tabId) return null
  if (pending.ownerTabId === tabId) return pending
  if (pending.ownerTabId && amwalTabLease.ownerIsActive(pending.ownerTabId)) return null

  const raw = localStorage.getItem(AMWAL_PENDING_ORDER_KEY)
  if (!raw) return null
  const actual = readPendingAmwalOrder()
  if (!pendingCheckoutIdentityMatches(pending, actual)) return null

  try {
    const parsed = JSON.parse(raw)
    if (localStorage.getItem(AMWAL_PENDING_ORDER_KEY) !== raw) return null
    const claimed = { ...parsed, ownerTabId: tabId }
    localStorage.setItem(AMWAL_PENDING_ORDER_KEY, JSON.stringify(claimed))
    const persisted = readPendingAmwalOrder()
    return pendingCheckoutIdentityMatches(claimed, persisted) ? persisted : null
  } catch {
    return null
  }
}

const clearPendingAmwalOrder = (expected: PendingAmwalOrder | null = pendingAmwalOrder.value) => {
  if (expected && pendingAmwalOrder.value && !pendingCheckoutIdentityMatches(expected, pendingAmwalOrder.value)) {
    return false
  }

  invalidateAmwalCallbackGeneration(expected)
  pendingAmwalOrder.value = null
  pendingOrderDetails.value = null
  pendingIdentityVerified.value = false
  if (import.meta.client && expected) {
    const stored = readPendingAmwalOrder()
    if (pendingCheckoutIdentityMatches(expected, stored)) {
      localStorage.removeItem(AMWAL_PENDING_ORDER_KEY)
    }
  }
  return true
}

const pendingAmwalOrderIsOwnedByThisTab = (pending: PendingAmwalOrder | null | undefined) => {
  if (!pending || !import.meta.client) return false
  return pendingCheckoutBelongsToTab(pending, currentAmwalTabId())
    && pendingCheckoutIdentityMatches(pending, readPendingAmwalOrder())
}

const currentCheckoutItems = () => cart.cartItems.map(item => ({
  id: item.id,
  vendor_offer_id: item.vendorOfferId ?? null,
  quantity: item.quantity,
  price: cart.effectiveUnitPrice(item),
}))

const buildPendingOrderSnapshot = (responseData: any) => {
  const serverTotals = responseData?.totals || {}
  const fallbackTotals = saved.value?.totals || {}
  const responseItems = responseData?.items
  const items = Array.isArray(responseItems) && responseItems.length > 0
    ? responseItems
    : cart.cartItems.map(item => ({
      ...item,
      product_id: item.id,
        vendor_offer_id: item.vendorOfferId ?? null,
      quantity: item.quantity,
      unit_price: cart.effectiveUnitPrice(item),
      product_name: productName(item),
      image_path: item.image,
    }))

  const fulfillment = responseData?.fulfillment || (saved.value?.deliveryMethod === 'pickup'
    ? { type: 'pickup', pickup: { location_name: '' } }
    : { type: 'shipping', shipping: { address: shippingAddressText.value } })

  return {
    totals: {
      original_subtotal: Number(serverTotals.original_subtotal ?? fallbackTotals.original_subtotal ?? fallbackTotals.subtotal ?? 0),
      product_discount: Number(serverTotals.product_discount ?? fallbackTotals.product_discount ?? 0),
      subtotal: Number(serverTotals.subtotal ?? fallbackTotals.subtotal ?? 0),
      shipping: Number(serverTotals.shipping ?? fallbackTotals.shipping ?? 0),
      vat: Number(serverTotals.vat ?? fallbackTotals.vat ?? 0),
      loyalty_discount: Number(serverTotals.loyalty_discount ?? fallbackTotals.loyalty_discount ?? 0),
      grand_total: Number(serverTotals.grand_total ?? serverTotals.grand ?? fallbackTotals.grand ?? 0),
    },
    items,
    fulfillment,
  }
}

const pendingAmwalOrderFromResponse = (
  responseData: any,
  checkoutKey: string,
  ownerTabId: string,
): PendingAmwalOrder | null => {
  const orderId = Number(responseData?.order_id)
  if (!Number.isInteger(orderId) || orderId <= 0) return null
  const summary = buildPendingOrderSnapshot(responseData)
  return {
    orderId,
    orderCode: responseData?.order_code || null,
    checkoutKey,
    amount: Number(responseData?.totals?.grand_total ?? responseData?.totals?.grand ?? summary.totals.grand_total),
    currency: 'OMR',
    summary,
    ownerTabId,
  }
}

const savedCheckoutMatchesCurrentCart = () => Boolean(
  saved.value
  && cart.cartItems.length > 0
  && checkoutItemsMatch(saved.value.items, currentCheckoutItems()),
)

const reconcileCurrentCheckoutTotals = () => {
  const checkout = saved.value
  const ownerKey = checkout?.idempotencyKey
  if (!checkout || !ownerKey || !checkoutStateIsOwnedBy(ownerKey)) return false

  const expectedTotals = deriveCheckoutTotals({
    originalSubtotal: cart.totalOriginalPrice(),
    productDiscount: cart.totalDiscount(),
    subtotal: cart.totalPrice(),
    shipping: checkout.deliveryMethod === 'ship'
      ? Number(checkout.shippingOption?.total_price ?? 0)
      : 0,
    vatRate: cart.vat,
  })
  const reconciledTotals = reconcileCheckoutTotals(checkout.totals, expectedTotals)
  if (!reconciledTotals) return false

  checkout.totals = {
    ...reconciledTotals,
    currency: checkout.totals?.currency || 'OMR',
  }
  localStorage.setItem('checkout_prefill', JSON.stringify(checkout))
  currentCheckoutReconciled.value = true
  return true
}

const detachPendingCheckout = (pending: PendingAmwalOrder, preserveCurrentCheckout: boolean) => {
  const persistedBeforeDetach = import.meta.client ? readStoredCheckoutPrefill() : null
  const legacyMigrationOwner = import.meta.client
    ? legacyCheckoutMigrationOwner({
      pendingKey: pending.checkoutKey,
      savedKey: saved.value?.idempotencyKey,
      storedKey: localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY),
      prefillKey: persistedBeforeDetach?.idempotencyKey,
    })
    : ''

  if (!clearPendingAmwalOrder(pending)) return false
  if (import.meta.client && !pending.checkoutKey) {
    sessionStorage.setItem(AMWAL_FORCE_FRESH_KEY, '1')
  }
  isOrderPlaced.value = false
  placedOrderResponse.value = null

  if (!import.meta.client) return true

  if (legacyMigrationOwner) {
    if (preserveCurrentCheckout && saved.value && cart.cartItems.length > 0) {
      const nextKey = makeCheckoutIdempotencyKey()
      saved.value.idempotencyKey = nextKey
      localStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, nextKey)
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
      localStorage.setItem('checkout_prefill', JSON.stringify(saved.value))
      return true
    }

    const ownership = clearCheckoutStateIfOwned(legacyMigrationOwner)
    if (ownership.ownsStoredKey && ownership.ownsPrefill) saved.value = null
    return true
  }

  const storedKey = localStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY)
  const persistedPrefill = readStoredCheckoutPrefill()
  const pendingOwnsStoredKey = Boolean(pending.checkoutKey && storedKey === pending.checkoutKey)
  const pendingOwnsPersistedPrefill = Boolean(
    pending.checkoutKey && persistedPrefill?.idempotencyKey === pending.checkoutKey,
  )

  if (preserveCurrentCheckout && saved.value && cart.cartItems.length > 0) {
    if (pendingOwnsStoredKey && pendingOwnsPersistedPrefill) {
      const nextKey = makeCheckoutIdempotencyKey()
      saved.value.idempotencyKey = nextKey
      localStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, nextKey)
      localStorage.removeItem(CHECKOUT_IDEMPOTENCY_SIGNATURE)
      localStorage.setItem('checkout_prefill', JSON.stringify(saved.value))
    }
    return true
  }

  const ownership = clearCheckoutStateIfOwned(pending.checkoutKey)
  if (ownership.ownsPrefill || saved.value?.idempotencyKey === pending.checkoutKey) {
    saved.value = null
  }
  return true
}

const clearCreationJournalForPending = (pending?: PendingAmwalOrder | null) => {
  if (!pending) return false
  const journal = amwalCheckoutReconciliation.read()
  if (!journal) return false
  if (journal.checkoutKey !== pending.checkoutKey || journal.ownerTabId !== pending.ownerTabId) return false
  return amwalCheckoutReconciliation.clear(journal)
}

const finalizeOrderSuccess = async (responseData: any) => {
  if (isSuccess.value || orderFinalizationInFlight.value) return
  orderFinalizationInFlight.value = true

  try {
  const orderId = Number(responseData?.order_id || pendingAmwalOrder.value?.orderId)
  const orderCode = responseData?.order_code || pendingAmwalOrder.value?.orderCode || null
  const completedPendingOrder = pendingAmwalOrder.value
  const completedCheckoutKey = pendingAmwalOrder.value?.checkoutKey

  isOrderPlaced.value = true
  amwalPhase.value = 'paid'
  amwalMessage.value = ''
  try {
    await loyaltyStore.refresh()
  } catch {
    // Loyalty is a derived post-payment view. Its availability must never keep
    // a captured payment attached to a stale browser checkout.
  }

  let savedOrderDetails: any = null
  try {
    const detailsRes = await $axios.get(`/api/orders/${orderId}/details`, { withCredentials: true })
    savedOrderDetails = detailsRes.data
  } catch {
    savedOrderDetails = null
  }

  if (saved.value) {
    try {
      const serverTotals = savedOrderDetails?.totals || responseData?.totals || {}
      const pdfSaved = {
        ...saved.value,
        totals: {
          ...saved.value.totals,
          originalSubtotal: Number(serverTotals.original_subtotal ?? saved.value.totals.original_subtotal ?? 0),
          productDiscount: Number(serverTotals.product_discount ?? saved.value.totals.product_discount ?? 0),
          subtotal: Number(serverTotals.subtotal ?? saved.value.totals.subtotal ?? 0),
          shipping: Number(serverTotals.shipping ?? saved.value.totals.shipping ?? 0),
          vat: Number(serverTotals.vat ?? saved.value.totals.vat ?? 0),
          loyaltyDiscount: Number(serverTotals.loyalty_discount ?? loyaltyDiscount.value.toFixed(3)),
          grand: Number(serverTotals.grand ?? serverTotals.grand_total ?? payableGrand.value.toFixed(3)),
        },
      }

      const invoiceRef = orderCode || saved.value.orderRef || `ISC-INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
      pdfUrl.value = await buildPdfUrl({
        saved: pdfSaved,
        company: {
          name: 'Industrial Supplies Center LLC',
          address: 'PO BOX 39, M.C.C., PC: 101 101, Way No: 7715\nMabelah, Sanaiya, Muscat, Oman',
          phone: '+968 24460320',
          vat: 'OM1100033153',
        },
        buyer: {
          name: selectedAddress.value?.Contact_Person_Name || user?.value?.Customer_Full_Name || user?.value?.Company_Name || 'Customer',
          address: shippingAddressText.value,
        },
        supplierContact: { name: 'IC', phone: '+968 93219447', email: 'motorsales@isc-depot.com' },
        buyerContact: selectedAddress.value
          ? { name: selectedAddress.value.Contact_Person_Name, phone: formatPhone(selectedAddress.value.Telephone_Country_Code, selectedAddress.value.Telephone), email: user?.value?.Email }
          : undefined,
        meta: {
          title: 'INVOICE',
          ref: invoiceRef,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          bank: {
            accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
            accountNo: '1074-0105031-001',
            currency: saved.value.totals?.currency || 'OMR',
            swift: 'NBOMOMRXXXX',
            bank: 'National Bank of Oman',
            branch: 'Corporate Branch, PO Box 751, PC: 112, Ruwi, Muscat, Sultanate of Oman',
          },
        },
        lines: savedOrderDetails?.items?.length ? linesForPdf(savedOrderDetails.items) : [],
      })
    } catch {
      pdfUrl.value = ''
    }
  }

  try {
    await cart.loadCart()
  } catch {
    // The order is already persisted; a later cart refresh can reconcile UI state.
  }
  clearCheckoutStateIfOwned(completedCheckoutKey)
  clearCreationJournalForPending(completedPendingOrder)
  clearPendingAmwalOrder(completedPendingOrder)
  isSuccess.value = true
  } finally {
    orderFinalizationInFlight.value = false
  }
}

const fetchAmwalStatus = async () => {
  const pending = pendingAmwalOrder.value
  if (!pending) return null
  const { data } = await $axios.get(`/api/payments/amwal/orders/${pending.orderId}/status`, { withCredentials: true })
  const payment = data?.payment || null
  const amount = Number(payment?.amount)
  if (payment && Number.isFinite(amount) && amount >= 0 && pendingAmwalOrder.value?.orderId === pending.orderId) {
    persistPendingAmwalOrder({
      ...pending,
      orderCode: payment.order_code || pending.orderCode,
      amount,
      currency: payment.currency || pending.currency || 'OMR',
    }, pending)
  }
  return payment
}

const paymentRequiresReview = (payment: any) => Boolean(
  payment?.requires_review
  || payment?.status === 'paid_requires_review'
  || payment?.order_status === 'paid_requires_review',
)

const retainPendingAmwalRecovery = (message = t('checkout.amwalCancelError')) => {
  amwalPhase.value = 'pending'
  amwalMessage.value = message
  return false
}

const routeCapturedAmwalOrderToOrders = async () => {
  const pending = pendingAmwalOrder.value
  if (pending) {
    clearCreationJournalForPending(pending)
    detachPendingCheckout(pending, false)
  } else {
    isOrderPlaced.value = false
    placedOrderResponse.value = null
  }
  amwalPhase.value = 'idle'
  amwalMessage.value = t('checkout.amwalUnavailableOrder')
  await navigateTo('/account?tab=orders')
}

const finishRestoredAmwalAttempt = async ({
  pending = pendingAmwalOrder.value,
  preserveCurrentCheckout = false,
  navigateToCart = true,
}: {
  pending?: PendingAmwalOrder | null
  preserveCurrentCheckout?: boolean
  navigateToCart?: boolean
} = {}) => {
  if (!pending) return false
  clearCreationJournalForPending(pending)
  if (!detachPendingCheckout(pending, preserveCurrentCheckout)) return false

  amwalPhase.value = 'cancelled'
  amwalMessage.value = preserveCurrentCheckout ? '' : t('checkout.amwalCancelled')
  try {
    await cart.loadCart()
  } catch {
    // The cart page performs another authoritative refresh after navigation.
  }
  if (navigateToCart) await navigateTo('/cart')
  return true
}

const handleTerminalAmwalStatus = async (
  status: any,
  options: {
    pending?: PendingAmwalOrder | null
    preserveCurrentCheckout?: boolean
    navigateToCart?: boolean
  } = {},
) => {
  if (!cartRestorationIsSafe(status?.cart_restoration)) {
    return retainPendingAmwalRecovery()
  }

  return await finishRestoredAmwalAttempt(options)
}

const cancelPendingAmwalOrder = async ({
  preserveCurrentCheckout = false,
  navigateToCart = false,
  restoreCart = false,
  allowDuringPaymentUi = false,
}: {
  preserveCurrentCheckout?: boolean
  navigateToCart?: boolean
  restoreCart?: boolean
  allowDuringPaymentUi?: boolean
} = {}) => {
  const pending = pendingAmwalOrder.value
  if (!pending || pendingCancellationInFlight.value) return false
  // Never let a stale checkout tab cancel a payment attempt created or
  // replaced by another tab. The cart page will observe that foreign marker
  // and wait for its owning tab to finish disposing the attempt.
  if (!pendingAmwalOrderIsOwnedByThisTab(pending)) {
    if (navigateToCart) await navigateTo('/cart')
    return false
  }
  if ((!allowDuringPaymentUi && isSubmitting.value) || amwalVerificationInFlight.value || orderFinalizationInFlight.value) return false

  pendingCancellationInFlight.value = true
  amwalPhase.value = 'cancelling'
  amwalMessage.value = t('checkout.amwalCancelling')

  try {
    const { data } = await $axios.post(
      `/api/payments/amwal/orders/${pending.orderId}/cancel`,
      { restore_cart: restoreCart },
      { withCredentials: true },
    )

    if (data?.payment?.paid) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: data.payment.order_id,
        order_code: data.payment.order_code,
      })
      return false
    }
    if (paymentRequiresReview(data?.payment)) {
      await routeCapturedAmwalOrderToOrders()
      return false
    }

    const cartRestoration = data?.cancellation?.cart_restoration
    if (restoreCart && !cartRestorationIsSafe(cartRestoration)) {
      return retainPendingAmwalRecovery()
    }

    return await finishRestoredAmwalAttempt({
      pending,
      preserveCurrentCheckout,
      navigateToCart,
    })
  } catch (error: any) {
    if (Number(error?.response?.status) === 404) {
      // A stale browser marker must not attach this customer's cart to an
      // unavailable or different order. Forget only state owned by that marker
      // and reload the current authoritative cart.
      detachPendingCheckout(pending, false)
      try {
        await cart.loadCart()
      } catch {
        // The cart page retries its own server refresh after navigation.
      }
      if (navigateToCart) await navigateTo('/cart')
      return true
    }

    try {
      const status = await fetchAmwalStatus()
      if (status?.paid) {
        await finalizeOrderSuccess({
          ...placedOrderResponse.value,
          order_id: status.order_id,
          order_code: status.order_code,
        })
        return false
      }
      if (paymentRequiresReview(status)) {
        await routeCapturedAmwalOrderToOrders()
        return false
      }
      if (status && status.payable === false) {
        return await handleTerminalAmwalStatus(status, {
          pending,
          preserveCurrentCheckout,
          navigateToCart,
        })
      }
    } catch {
      // Keep the old order attached until the server confirms it is safe to detach.
    }

    return retainPendingAmwalRecovery()
  } finally {
    pendingCancellationInFlight.value = false
  }
}

const recoverAmwalCreationJournal = async ({ navigateToCart = true } = {}) => {
  let journal = amwalCheckoutReconciliation.read()
  if (!journal) return 'none'
  if (journal.ownerTabId !== currentAmwalTabId()) {
    if (amwalTabLease.ownerIsActive(journal.ownerTabId)) {
      if (navigateToCart) await navigateTo('/cart')
      return 'external'
    }
    const claimed = amwalCheckoutReconciliation.takeover(journal)
    if (!claimed) {
      if (navigateToCart) await navigateTo('/cart')
      return 'external'
    }
    journal = claimed
  }

  amwalMessage.value = t('checkout.amwalVerifying')
  const reconciliation = await amwalCheckoutReconciliation.reconcile(journal)
  if (reconciliation.kind === 'absent') {
    amwalCheckoutReconciliation.clear(journal)
    amwalMessage.value = ''
    return 'absent'
  }
  if (reconciliation.kind === 'ambiguous') {
    amwalMessage.value = t('checkout.amwalStatusError')
    if (navigateToCart) await navigateTo('/cart')
    return 'ambiguous'
  }

  const responseData = reconciliation.data
  const recoveredPending = pendingAmwalOrderFromResponse(
    responseData,
    journal.checkoutKey,
    journal.ownerTabId,
  )
  if (!recoveredPending) {
    amwalMessage.value = t('checkout.amwalStatusError')
    if (navigateToCart) await navigateTo('/cart')
    return 'ambiguous'
  }

  const storedPending = readPendingAmwalOrder()
  const persisted = storedPending
    ? pendingCheckoutIdentityMatches(recoveredPending, storedPending)
      && persistPendingAmwalOrder(recoveredPending, storedPending)
    : persistPendingAmwalOrder(recoveredPending, null)
  if (!persisted) {
    if (navigateToCart) await navigateTo('/cart')
    return 'external'
  }

  placedOrderResponse.value = responseData
  pendingOrderDetails.value = recoveredPending.summary || null
  pendingIdentityVerified.value = true
  step.value = 'payment'
  paymentMethod.value = 'card'
  amwalCheckoutReconciliation.clear(journal)

  if (responseData?.payment?.paid) {
    await finalizeOrderSuccess(responseData)
    return 'paid'
  }
  if (paymentRequiresReview(responseData?.payment)) {
    await routeCapturedAmwalOrderToOrders()
    return 'review'
  }

  await cancelPendingAmwalOrder({
    navigateToCart,
    restoreCart: true,
    allowDuringPaymentUi: true,
  })
  return 'recovered'
}

const returnToCart = async () => {
  if (amwalVerificationInFlight.value || orderFinalizationInFlight.value || pendingCancellationInFlight.value) return
  if (!pendingAmwalOrder.value) {
    await navigateTo('/cart')
    return
  }

  await cancelPendingAmwalOrder({
    navigateToCart: true,
    restoreCart: true,
    allowDuringPaymentUi: true,
  })
}

const cancelAndEditPendingOrder = async () => {
  if (amwalVerificationInFlight.value || orderFinalizationInFlight.value || pendingCancellationInFlight.value) return
  await cancelPendingAmwalOrder({
    navigateToCart: true,
    restoreCart: true,
    allowDuringPaymentUi: true,
  })
}

const handleAmwalCancel = async () => {
  if (isSuccess.value || !pendingAmwalOrder.value) return

  // SmartBox's close callback is an abandon request, not payment evidence.
  // The server serializes this request with signed success notifications: a
  // captured payment wins, otherwise the temporary checkout is cancelled and
  // the authoritative cart is restored exactly once.
  await cancelPendingAmwalOrder({
    navigateToCart: true,
    restoreCart: true,
    allowDuringPaymentUi: true,
  })
}

const extractAmwalResponseCode = (payload?: Record<string, unknown> | null) => {
  if (!payload) return null

  let value = payload.responseCode ?? payload.response_code
  if (value === null || value === undefined) {
    const nested = payload.data
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      value = (nested as Record<string, unknown>).responseCode
        ?? (nested as Record<string, unknown>).response_code
    }
  }

  const code = String(value ?? '').trim()
  return /^[A-Za-z0-9_-]{1,16}$/.test(code) ? code : null
}

const amwalFailureMessage = (responseCode?: string | null) => responseCode
  ? t('checkout.amwalDeclinedCode', { code: responseCode })
  : t('checkout.amwalError')

const handleAmwalError = async (payload?: Record<string, unknown>) => {
  if (isSuccess.value) return

  const expectedOrderId = pendingAmwalOrder.value?.orderId
  amwalPhase.value = 'failed'
  amwalMessage.value = amwalFailureMessage(extractAmwalResponseCode(payload))

  if (!expectedOrderId) return

  if (payload) {
    try {
      const { data } = await $axios.post(
        `/api/payments/amwal/orders/${expectedOrderId}/callback`,
        { payload },
        { withCredentials: true },
      )
      const payment = data?.payment
      if (payment?.paid && Number(payment.order_id) === expectedOrderId) {
        await finalizeOrderSuccess({
          ...placedOrderResponse.value,
          order_id: payment.order_id,
          order_code: payment.order_code,
        })
        return
      }
      if (paymentRequiresReview(payment)) {
        await routeCapturedAmwalOrderToOrders()
        return
      }

      amwalMessage.value = amwalFailureMessage(extractAmwalResponseCode(payment))
    } catch {
      // Malformed or unsigned browser errors never change payment state.
    }
  }

  try {
    const status = await fetchAmwalStatus()
    if (status?.paid) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: status.order_id,
        order_code: status.order_code,
      })
      return
    }
    if (paymentRequiresReview(status)) {
      await routeCapturedAmwalOrderToOrders()
      return
    }
    if (status?.status === 'failed') {
      amwalMessage.value = amwalFailureMessage(extractAmwalResponseCode(status))
    }
  } catch {
    // The cancellation endpoint performs the same captured-state check under
    // lock, so it remains safe to try cleanup when status refresh is offline.
  }

  if (pendingAmwalOrder.value?.orderId === expectedOrderId) {
    await cancelPendingAmwalOrder({
      navigateToCart: true,
      restoreCart: true,
      allowDuringPaymentUi: true,
    })
  }
}

const verifyAmwalCompletion = async (payload: Record<string, unknown>) => {
  if (amwalVerificationInFlight.value || isSuccess.value) return
  amwalVerificationInFlight.value = true
  let disposeFailedAttempt = false

  try {
  amwalPhase.value = 'verifying'
  amwalMessage.value = t('checkout.amwalVerifying')

  try {
    const expectedOrderId = pendingAmwalOrder.value?.orderId
    if (!expectedOrderId) return
    const { data } = await $axios.post(`/api/payments/amwal/orders/${expectedOrderId}/callback`, { payload }, { withCredentials: true })
    if (data?.payment?.paid && Number(data.payment.order_id) === expectedOrderId) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: data.payment.order_id,
        order_code: data.payment.order_code,
      })
      return
    }
  } catch {
    // The cloud notification may have won the race; status remains authoritative.
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise(resolve => window.setTimeout(resolve, 1500))
    try {
      const status = await fetchAmwalStatus()
      if (status?.paid) {
        await finalizeOrderSuccess({
          ...placedOrderResponse.value,
          order_id: status.order_id,
          order_code: status.order_code,
        })
        return
      }
      if (paymentRequiresReview(status)) {
        await routeCapturedAmwalOrderToOrders()
        return
      }
      if (status && status.payable === false) {
        await handleTerminalAmwalStatus(status)
        return
      }
      if (status?.status === 'failed') {
        amwalPhase.value = 'failed'
        amwalMessage.value = t('checkout.amwalFailed')
        disposeFailedAttempt = true
        break
      }
    } catch {
      // Keep polling briefly; a delayed notification or refreshed login can recover.
    }
  }

  if (!disposeFailedAttempt) {
    amwalPhase.value = 'pending'
    amwalMessage.value = t('checkout.amwalPending')
  }
  } finally {
    amwalVerificationInFlight.value = false
  }

  if (disposeFailedAttempt) {
    await cancelPendingAmwalOrder({
      navigateToCart: true,
      restoreCart: true,
      allowDuringPaymentUi: true,
    })
  }
}

const amwalCallbackGenerationIsCurrent = (
  expected: PendingAmwalOrder,
  generation: number,
) => Boolean(
  generation === amwalCallbackGeneration
  && activeAmwalCallbackIdentity === amwalIdentityToken(expected)
  && pendingCheckoutIdentityMatches(expected, pendingAmwalOrder.value)
  && pendingCheckoutIdentityMatches(expected, readPendingAmwalOrder()),
)

const enqueueAmwalCallback = (
  expected: PendingAmwalOrder,
  generation: number,
  action: () => Promise<unknown>,
) => {
  const run = async () => {
    if (!amwalCallbackGenerationIsCurrent(expected, generation)) return

    amwalCallbackInFlight.value = true
    try {
      if (amwalCallbackGenerationIsCurrent(expected, generation)) await action()
    } finally {
      amwalCallbackInFlight.value = false
    }
  }

  amwalCallbackQueue = amwalCallbackQueue.then(run, run)
}

const startAmwalPayment = async () => {
  const pending = pendingAmwalOrder.value
  if (!pending || !pendingIdentityVerified.value || amwalOperationInFlight.value) return
  const callbackGeneration = activateAmwalCallbackGeneration(pending)

  isSubmitting.value = true
  amwalPhase.value = 'opening'
  amwalMessage.value = t('checkout.amwalOpening')

  try {
    const currentStatus = await fetchAmwalStatus()
    if (currentStatus?.paid) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: currentStatus.order_id,
        order_code: currentStatus.order_code,
      })
      return
    }
    if (paymentRequiresReview(currentStatus)) {
      await routeCapturedAmwalOrderToOrders()
      return
    }
    if (currentStatus && currentStatus.payable === false) {
      await handleTerminalAmwalStatus(currentStatus)
      return
    }

    const { data } = await $axios.post(
      `/api/payments/amwal/orders/${pending.orderId}/configuration`,
      { language: locale.value },
      { withCredentials: true },
    )

    if (data?.payment?.paid) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: data.payment.order_id,
        order_code: data.payment.order_code,
      })
      return
    }
    if (paymentRequiresReview(data?.payment)) {
      await routeCapturedAmwalOrderToOrders()
      return
    }

    if (!data?.smartbox?.script_url || !data?.smartbox?.configuration) {
      throw new Error('SmartBox configuration is missing.')
    }

    await openAmwalSmartBox(data.smartbox.script_url, data.smartbox.configuration, {
      complete: payload => enqueueAmwalCallback(
        pending,
        callbackGeneration,
        () => verifyAmwalCompletion(payload),
      ),
      error: payload => enqueueAmwalCallback(
        pending,
        callbackGeneration,
        () => handleAmwalError(payload),
      ),
      cancel: () => enqueueAmwalCallback(
        pending,
        callbackGeneration,
        () => handleAmwalCancel(),
      ),
    })

    if (!pendingAmwalOrder.value || pendingCancellationInFlight.value) return
    amwalPhase.value = 'awaiting'
    amwalMessage.value = t('checkout.amwalAwaiting')
  } catch {
    amwalPhase.value = 'failed'
    amwalMessage.value = t('checkout.amwalError')
    await cancelPendingAmwalOrder({
      navigateToCart: true,
      restoreCart: true,
      allowDuringPaymentUi: true,
    })
  } finally {
    isSubmitting.value = false
  }
}

const checkPendingAmwalPayment = async () => {
  if (!pendingAmwalOrder.value || amwalOperationInFlight.value) return
  isSubmitting.value = true
  amwalPhase.value = 'verifying'
  amwalMessage.value = t('checkout.amwalVerifying')
  try {
    const status = await fetchAmwalStatus()
    if (status?.paid) {
      await finalizeOrderSuccess({
        ...placedOrderResponse.value,
        order_id: status.order_id,
        order_code: status.order_code,
      })
    } else if (paymentRequiresReview(status)) {
      await routeCapturedAmwalOrderToOrders()
    } else if (status && status.payable === false) {
      await handleTerminalAmwalStatus(status)
    } else if (status?.status === 'failed') {
      amwalPhase.value = 'failed'
      amwalMessage.value = t('checkout.amwalFailed')
    } else {
      amwalPhase.value = 'pending'
      amwalMessage.value = t('checkout.amwalPending')
    }
  } catch (error: any) {
    if ([404, 409].includes(Number(error?.response?.status))) {
      retainPendingAmwalRecovery(t('checkout.amwalStatusError'))
      return
    }
    amwalPhase.value = 'pending'
    amwalMessage.value = t('checkout.amwalStatusError')
  } finally {
    isSubmitting.value = false
  }
}


 

// ---------------------
// Submit
// ---------------------
const submitOrder = async () => {
  if (cart.cartItems.length === 0 || isSubmitting.value) return
  if (!canSubmit.value) {
    triedSubmit.value = true
    return
  }

  isSubmitting.value = true
  amwalMessage.value = ''
  let cardCreationJournal: ReturnType<typeof amwalCheckoutReconciliation.read> = null

  try {
    currentCheckoutReconciled.value = false
    await cart.loadCart()
    if (!savedCheckoutMatchesCurrentCart()) {
      clearCheckoutStateIfOwned(saved.value?.idempotencyKey)
      saved.value = null
      await navigateTo('/cart')
      return
    }

    // Another tab may have placed an order after this page mounted. Never
    // create a second order from a checkout whose shared identity changed.
    const stalePending = readPendingAmwalOrder()
    if (stalePending) {
      if (!pendingCheckoutBelongsToTab(stalePending, currentAmwalTabId())) {
        const claimed = claimPendingAmwalOrderForThisTab(stalePending)
        if (!claimed) {
          await navigateTo('/cart')
          return
        }
        persistPendingAmwalOrder(claimed, claimed)
      } else {
        persistPendingAmwalOrder(stalePending, stalePending)
      }
      await cancelPendingAmwalOrder({
        navigateToCart: true,
        restoreCart: true,
        allowDuringPaymentUi: true,
      })
      return
    }
    if (!checkoutStateIsOwnedBy(saved.value?.idempotencyKey) || !reconcileCurrentCheckoutTotals()) {
      saved.value = null
      await navigateTo('/cart')
      return
    }

    const effectivePaymentMethod = payableGrand.value <= 0 ? 'loyalty' : paymentMethod.value
    const idempotencyKey = ensureSavedIdempotencyKey()
    const payment = {
      method: effectivePaymentMethod,
      currency: 'OMR',
      amount: Number(payableGrand.value.toFixed(3)),
      transfer: effectivePaymentMethod === 'transfer' ? {
        reference: transfer.value.reference,
        payer_name: transfer.value.payerName
      } : null
    }

    const payload = {

      delivery_method: cart.deliveryMethod,
      location_id: pickupLocationId.value,
      shipping_cost: savedShippingCost.value,
      Customers_Contacts_Id: cart.deliveryMethod === 'ship' ? (saved.value?.addressId ?? null) : null,
      VAT: savedVat.value,
      idempotency_key: idempotencyKey,


      shipping_option: cart.deliveryMethod === 'ship' && saved.value?.shippingOption ? {
        shipper_id: saved.value.shippingOption.shipper_id,
        destination_id: saved.value.shippingOption.destination_id,
        basis: saved.value.shippingOption.basis,
        price: Number(saved.value.shippingOption.total_price),
        currency: saved.value.shippingOption.currency ?? 'OMR',
        quoted_at: saved.value.shippingOption.quoted_at ?? null,
        expires_at: saved.value.shippingOption.expires_at ?? null,
        // Optional: include any server totals you persisted
        // weight_kg: saved.value.totalsFromServer?.weight_kg,
        // volume_cbm: saved.value.totalsFromServer?.volume_cbm,
      } : null,

      total: {
        currency: 'OMR',
        subtotal: Number(savedSubtotal.value.toFixed(3)),
        shipping: Number(savedShippingCost.value.toFixed(3)),
        vat: Number(savedVat.value.toFixed(3)),
        before_loyalty: Number(savedGrand.value.toFixed(3)),
        loyalty_discount: Number(loyaltyDiscount.value.toFixed(3)),
        grand: Number(payableGrand.value.toFixed(3))
      },

      loyalty: {
        use_points: effectiveLoyaltyPoints.value > 0,
        points: effectiveLoyaltyPoints.value,
      },

      cart_items: cart.cartItems.map(item => ({
        product_id: item.id,
        vendor_offer_id: item.vendorOfferId ?? null,
        quantity: item.quantity,
        // Effective unit price (bulk tier wins over product discounts); the server
        // recomputes pricing authoritatively in place(), this keeps display == server.
        price: cart.effectiveUnitPrice(item),
        subtotal: cart.effectiveUnitPrice(item) * item.quantity,
        vat: 0,
      })),
      payment
    }

    if (effectivePaymentMethod === 'card') {
      cardCreationJournal = {
        checkoutKey: idempotencyKey,
        ownerTabId: currentAmwalTabId(),
        createdAt: Date.now(),
      }
      if (!(await amwalCheckoutReconciliation.claim(cardCreationJournal))) {
        cardCreationJournal = null
        await navigateTo('/cart')
        return
      }
    }

    const response = await $axios.post('/api/orders/place', payload, {
      withCredentials: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    })

    placedOrderResponse.value = response.data

    if (effectivePaymentMethod === 'card' && response.data?.payment?.requires_action) {
      const serverTotals = response.data?.totals || {}
      if (saved.value) {
        saved.value.totals = {
          ...saved.value.totals,
          original_subtotal: Number(serverTotals.original_subtotal ?? saved.value.totals.original_subtotal ?? 0),
          product_discount: Number(serverTotals.product_discount ?? saved.value.totals.product_discount ?? 0),
          subtotal: Number(serverTotals.subtotal ?? saved.value.totals.subtotal ?? 0),
          shipping: Number(serverTotals.shipping ?? saved.value.totals.shipping ?? 0),
          vat: Number(serverTotals.vat ?? saved.value.totals.vat ?? 0),
          before_loyalty: Number(serverTotals.before_loyalty ?? saved.value.totals.before_loyalty ?? 0),
          loyalty_discount: Number(serverTotals.loyalty_discount ?? saved.value.totals.loyalty_discount ?? 0),
          grand: Number(serverTotals.grand ?? saved.value.totals.grand ?? payableGrand.value),
        }
        if (import.meta.client) localStorage.setItem('checkout_prefill', JSON.stringify(saved.value))
      }

      const pendingSnapshot = buildPendingOrderSnapshot(response.data)
      pendingOrderDetails.value = pendingSnapshot
      const newPendingOrder = pendingAmwalOrderFromResponse(
        response.data,
        idempotencyKey,
        cardCreationJournal?.ownerTabId || currentAmwalTabId(),
      )
      if (!newPendingOrder || !persistPendingAmwalOrder(newPendingOrder, null)) {
        isSubmitting.value = false
        await navigateTo('/cart')
        return
      }
      if (cardCreationJournal) amwalCheckoutReconciliation.clear(cardCreationJournal)
      pendingIdentityVerified.value = true
      isSubmitting.value = false
      await startAmwalPayment()
      return
    }

   const orderCode = response.data?.order_code

    if (response.status === 200) {

      isOrderPlaced.value = true; 
      await loyaltyStore.refresh()
      let savedOrderDetails: any = null
      try {
        const detailsRes = await $axios.get(`/api/orders/${response.data?.order_id}/details`, { withCredentials: true })
        savedOrderDetails = detailsRes.data
      } catch (detailsError) {
        console.error('Order details fetch for PDF failed:', detailsError)
      }

      // 1) Build PDF *before* clearing the cart so item names/qtys appear
      try {
        const serverTotals = savedOrderDetails?.totals || response.data?.totals || {}
        const pdfSaved = {
          ...saved.value!,
          totals: {
            ...saved.value!.totals,
            originalSubtotal: Number(serverTotals.original_subtotal ?? saved.value!.totals.original_subtotal ?? 0),
            productDiscount: Number(serverTotals.product_discount ?? saved.value!.totals.product_discount ?? 0),
            subtotal: Number(serverTotals.subtotal ?? saved.value!.totals.subtotal ?? 0),
            shipping: Number(serverTotals.shipping ?? saved.value!.totals.shipping ?? 0),
            vat: Number(serverTotals.vat ?? saved.value!.totals.vat ?? 0),
            loyaltyDiscount: Number(serverTotals.loyalty_discount ?? loyaltyDiscount.value.toFixed(3)),
            grand: Number(serverTotals.grand ?? serverTotals.grand_total ?? payableGrand.value.toFixed(3)),
          },
        }

        const invoiceRef = orderCode || saved.value?.orderRef || `ISC-INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`

        pdfUrl.value = await buildPdfUrl({
          saved: pdfSaved, // uses your persisted totals/currency
          company: {
            name: 'Industrial Supplies Center LLC',
            address: 'PO BOX 39, M.C.C., PC: 101 101, Way No: 7715\nMabelah, Sanaiya, Muscat, Oman',
            phone: '+968 24460320',
            vat: 'OM1100033153'
          },
          buyer: {
            name: selectedAddress.value?.Contact_Person_Name || user?.value?.Customer_Full_Name || user?.value?.Company_Name || 'Customer',
            address: shippingAddressText.value
          },
          supplierContact: { name: 'IC', phone: '+968 93219447', email: 'motorsales@isc-depot.com' },
          buyerContact: selectedAddress.value
            ? { name: selectedAddress.value.Contact_Person_Name, phone: formatPhone(selectedAddress.value.Telephone_Country_Code, selectedAddress.value.Telephone), email: user?.value?.Email }
            : undefined,
          meta: {
            title: 'INVOICE',
            ref: invoiceRef,
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            bank: {
              accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
              accountNo: '1074-0105031-001',
              currency: saved.value?.totals?.currency || 'OMR',
              swift: 'NBOMOMRXXXX',
              bank: 'National Bank of Oman',
              branch: 'Corporate Branch, PO Box 751, PC: 112, Ruwi, Muscat, Sultanate of Oman'
            }
          },
          // Use cart items *now* (they’ll be cleared right after)
          lines: savedOrderDetails?.items?.length ? linesForPdf(savedOrderDetails.items) : linesForPdf()
        })
      } catch (e) {
        console.error('PDF build failed:', e)
        pdfUrl.value = '' // fallback
      }

      // 2) Now clean up the cart/localStorage
      try {
        await cart.loadCart()
      } catch {
        // Do not turn a successful order into a UI failure because cart refresh failed.
      }
      clearCheckoutStateIfOwned(idempotencyKey)
      if (cardCreationJournal) amwalCheckoutReconciliation.clear(cardCreationJournal)

      // 3) Show success section (which includes the PDF iframe)
      isSuccess.value = true
    }



  } catch (error: any) {
    const responseCode = String(error?.response?.data?.code || '')
    if (cardCreationJournal) {
      const status = Number(error?.response?.status)
      const definitiveCardConflict = status === 409 && [
        'AMWAL_RETRY_COOLDOWN',
        'AMWAL_RECONCILIATION_REQUIRED',
        'ACTIVE_AMWAL_ORDER_EXISTS',
        'STALE_CHECKOUT_KEY',
      ].includes(responseCode)
      const definitiveValidationFailure = [400, 401, 403, 404, 422].includes(status)
        || definitiveCardConflict
      if (definitiveValidationFailure) {
        amwalCheckoutReconciliation.clear(cardCreationJournal)
      } else {
        const recovered = await recoverAmwalCreationJournal()
        if (!['none', 'absent'].includes(recovered)) return
      }
    }
    amwalMessage.value = responseCode === 'AMWAL_RETRY_COOLDOWN'
      ? t('checkout.amwalRetryCooldown', {
        seconds: Number(error?.response?.data?.retry_after_seconds || 1),
      })
      : (error?.response?.data?.message || t('checkout.orderError'))
  } finally {
    isSubmitting.value = false
  }
}




const getshippingcod = async (id: number) : Promise<void> => {
  try {
    const res = await $axios.get('/api/shipping/cod',{ params: { 'shipper_id': id } })
     codsupported.value = res.data
  } catch (error) {
    console.error('Failed to fetch shipping COD data:', error)
  }
}

onMounted(async () => {
  amwalTabLease.start()
  try {
    const raw = localStorage.getItem('checkout_prefill')
    saved.value = raw ? JSON.parse(raw) as SavedCheckoutPrefill : null
  } catch {
    saved.value = null
  }

  if (saved.value) {
    cart.deliveryMethod = saved.value.deliveryMethod
    if (saved.value.addressId) cart.selectedAddressId = saved.value.addressId
    if (saved.value.locationId) cart.selectedLocationId = saved.value.locationId
    await fetchSelectedAddress(saved.value.addressId ?? null)
  }

  try {
    await cart.loadCart()
  } catch {
    // Cancellation below still uses the server-side cart transaction.
  }

  let serverVatLoaded = false
  try {
    await cart.getVat()
    serverVatLoaded = true
  } catch {
    // Saved/server order totals remain authoritative if VAT settings are unavailable.
  }

  let pending = readPendingAmwalOrder()
  const creationJournal = amwalCheckoutReconciliation.read()
  if (creationJournal) {
    const journalAlreadyAdopted = Boolean(
      pending
      && pending.checkoutKey === creationJournal.checkoutKey
      && pending.ownerTabId === creationJournal.ownerTabId,
    )
    if (journalAlreadyAdopted) {
      amwalCheckoutReconciliation.clear(creationJournal)
    } else {
      const recovered = await recoverAmwalCreationJournal()
      if (!['none', 'absent'].includes(recovered)) return
      pending = readPendingAmwalOrder()
    }
  }

  if (pending) {
    const tabId = currentAmwalTabId()
    if (!pendingCheckoutBelongsToTab(pending, tabId)) {
      const claimedPending = claimPendingAmwalOrderForThisTab(pending)
      if (!claimedPending) return navigateTo('/cart')
      pending = claimedPending
    }
    if (!pending.ownerTabId) {
      const claimedPending = { ...pending, ownerTabId: tabId }
      if (!persistPendingAmwalOrder(claimedPending, pending)) return navigateTo('/cart')
      pending = claimedPending
    }
    if (!persistPendingAmwalOrder(pending, pending)) {
      return navigateTo('/cart')
    }
    step.value = 'payment'
    paymentMethod.value = 'card'
    pendingIdentityVerified.value = true
    await cancelPendingAmwalOrder({
      navigateToCart: true,
      restoreCart: true,
    })
    return
  }

  if (!saved.value || !cart.cartItems.length) return navigateTo('/cart')
  if (!savedCheckoutMatchesCurrentCart()) {
    clearCheckoutStateIfOwned(saved.value?.idempotencyKey)
    saved.value = null
    return navigateTo('/cart')
  }
  if (saved.value.deliveryMethod === 'ship' && !saved.value.shippingOption) return navigateTo('/cart')
  if (!serverVatLoaded || !checkoutStateIsOwnedBy(saved.value.idempotencyKey) || !reconcileCurrentCheckoutTotals()) {
    saved.value = null
    return navigateTo('/cart')
  }

  await fetchLoyaltySummary()

  deliveryMethods.value = saved.value?.deliveryMethod
  const shipperId = Number(saved.value?.shippingOption?.shipper_id || 0)
  if (shipperId > 0) await getshippingcod(shipperId)
})

onBeforeUnmount(() => {
  amwalTabLease.stop()
})


 
</script>

<template>

  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white animate-fade-in" v-if="isSuccess">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-green-600 mb-2">{{ t('checkout.orderPlaced') }}</h2>
      <p class="text-gray-700">{{ t('checkout.thankYouPdf') }}</p>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-center gap-3 mb-4">
      <a v-if="pdfUrl" :href="pdfUrl" download="invoice.pdf"
        class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
        {{ t('checkout.downloadInvoice') }}
      </a>
      <button v-if="pdfUrl" type="button" @click="onPrintPdf"
        class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
        {{ t('checkout.print') }}
      </button>
      <NuxtLink to="/"
        class="inline-flex items-center rounded-md bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white px-4 py-2 text-sm font-semibold">
        {{ t('checkout.goHome') }}
      </NuxtLink>
    </div>

    <!-- PDF iframe -->
    <div class="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
      <div v-if="pdfUrl">
        <iframe :src="pdfUrl" class="w-full" style="height:min(80vh,900px)" title="Order confirmation PDF"></iframe>
      </div>
      <div v-else class="p-6 text-center text-sm text-slate-500">
        {{ t('checkout.buildingPdf') }}
      </div>
    </div>
  </section>


  <!-- STEP 1: Confirmation -->
  <section v-else-if="step === 'confirm'" class="max-w-screen-xl mx-auto px-4 py-8 bg-white">
    <div v-if="!currentCheckoutReconciled" class="rounded-lg border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-700" role="status">
      {{ t('checkout.verifyingTotals') }}
    </div>
    <OrderConfirm v-else :orderRef="saved?.orderRef || 'ISC-…'"
      :invoiceDate="new Date().toLocaleDateString()" :supplier="{
        name: 'Industrial Supplies Center LLC',
        lines: ['PO BOX 39, M.C.C., PC: 101', '101, Way No: 7715', 'Mabelah, Sanaiya, Muscat, Oman']
      }" :deliveryMethod="saved?.deliveryMethod || cart.deliveryMethod"
      :pickupLocationId="(saved?.locationId ?? cart.selectedLocationId ?? null)" :shipping="(saved?.deliveryMethod === 'ship' && saved?.shippingOption) ? {
        shipper_id: saved.shippingOption.shipper_id,
        destination_id: saved.shippingOption.destination_id,
        basis: saved.shippingOption.basis,
        currency: saved.shippingOption.currency || 'OMR',
        total_price: saved.shippingOption.total_price || 0,
        breakdown: saved.shippingOption.breakdown || [],
        deliverymethod: (saved as any)?.shippingOption?.shipper_name || '—'
      } : null" :buyer="{
    name: user?.Company_Name || '—',
    lines: selectedAddress ? [
      selectedAddress?.street || '',
      `${field(selectedAddress?.city, 'City_Name') || ''}, ${field(selectedAddress?.district, 'District_Name') || ''}`,
      `${field(selectedAddress?.region, 'Region_Name') || ''}, ${field(selectedAddress?.country, 'Country_Name') || ''}`
    ].filter(Boolean) : ['—']
  }" :supplierContact="{ label: 'SUPPLIER CONTACT', name: 'Muhammed Shanid', phone: '+968 93219447', tel: '+968 24460320', email: 'motorsales@isc-depot.com' }"
      :buyerContact="selectedAddress ? { label: 'BUYER CONTACT', name: selectedAddress?.Contact_Person_Name, phone: formatPhone(selectedAddress?.Telephone_Country_Code, selectedAddress?.Telephone), email: user?.Email } : undefined"
      paymentTerms="60 Days" currency="OMR" supplierTin="OM1100033153" buyerVatin="—" supplierDoRef="—" buyerPoRef="—"
      deliveryTerms="DDP Muscat" :bank="{
        accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
        accountNumber: '1074-0105031-001',
        currency: 'OMR',
        swift: 'NBOMOMRXXXX',
        bankName: 'National Bank of Oman',
        bankAddress: 'Corporate Branch, PO Box 751, PC:112, Ruwi, Muscat, Sultanate of Oman'
      }" :items="cart.cartItems.map((i: any, idx: number) => ({
        sl: idx + 1,
        description: invoiceProductDescription(i),
        qty: i.quantity,
        unit: 'EA',
        unitPrice: cart.effectiveUnitPrice(i),
        totalExcl: cart.effectiveUnitPrice(i) * Number(i.quantity),
        vatPct: +(cart.vat * 100).toFixed(2),
        vatAmt: cart.effectiveUnitPrice(i) * Number(i.quantity) * cart.vat,
        totalIncl: cart.effectiveUnitPrice(i) * Number(i.quantity) * (1 + cart.vat)
      }))" :totals="{
        originalSubtotal: savedOriginalSubtotal,
        productDiscount: savedProductDiscount,
        taxable: savedSubtotal,
        vat: savedVat,
        grand: savedGrand
      }" :onConfirm="() => { if (currentCheckoutReconciled) step = 'payment' }" />



  </section>



  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white" v-else-if="step === 'payment'">
    <!-- Back link -->
    <div class="mb-4">
      <button type="button" class="text-[#00bfa5] hover:underline text-sm disabled:text-gray-400" :disabled="amwalOperationInFlight" @click="returnToCart">
        ← {{ t('checkout.backToCart') }}
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-2 space-y-8">



        <!-- Products Review (Accordion) -->
        <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg shadow-sm">
          <!-- Header / Toggle -->
          <button type="button" class="w-full flex items-center justify-between px-5 py-4"
            @click="itemsOpen = !itemsOpen" :aria-expanded="itemsOpen" aria-controls="order-items">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold text-gray-800">{{ t('checkout.itemsInOrder') }}</span>
              <span class="text-xs text-gray-500">({{ checkoutDisplayItems.length }})</span>
            </div>

            <!-- Chevron -->
            <svg class="h-5 w-5 text-gray-600 transition-transform duration-200" :class="itemsOpen ? 'rotate-180' : ''"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
                clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Body -->
          <transition name="accordion">
	            <div v-show="itemsOpen" id="order-items" class="px-5 pb-5 overflow-hidden" role="region"
	              :aria-label="t('checkout.itemsInOrder')">
              <div v-for="item in checkoutDisplayItems" :key="displayItemKey(item)"
                class="flex justify-between items-center border-t pt-4 pb-5 first:border-t-0">
                <div class="flex gap-4">
	                  <img :src="`${$r2Url}/${displayItemImage(item)}`" :alt="displayItemName(item)" class="w-16 h-16 object-cover rounded border" />
                  <div class="text-sm">
                    <p class="font-semibold text-gray-800">{{ displayItemName(item) }}</p>
                    <p v-if="item.seller_name || item.sellerName" class="text-xs text-gray-500">{{ item.seller_name || item.sellerName }}</p>

                    <!-- Quantity + Buttons -->
                    <div class="flex items-center space-x-2 mt-1">

                      <span>{{ displayItemQuantity(item) }} Pc (s)</span>


                    </div>

                    <p class="text-xs text-gray-500 mt-1">
                      {{ t('common.omr') }} {{ lineUnitPrice(item).toFixed(3) }} / {{ t('product.each') }}
                      <span v-if="lineBulkTier(item)"
                        class="ml-1 inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 ring-1 ring-cyan-200">
                        {{ t('cart.bulkPrice') }}
                      </span>
                    </p>
                  </div>
                </div>

                <p class="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  {{ t('common.omr') }} {{ (lineUnitPrice(item) * displayItemQuantity(item)).toFixed(3) }}
                </p>
              </div>
            </div>
          </transition>
        </div>


        <div v-if="!pendingAmwalOrder" class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-gray-800 text-lg">{{ t('checkout.useLoyalty') }}</h3>
              <p class="text-xs text-gray-500 mt-1">{{ loyaltyRuleLabel }}</p>
            </div>
            <div class="text-right text-sm">
              <div class="font-semibold text-[#00bfa5]">{{ availableLoyaltyPoints.toLocaleString() }}</div>
              <div class="text-xs text-gray-500">{{ t('checkout.availablePoints') }}</div>
            </div>
          </div>

          <div v-if="loyaltyLoading" role="status" class="mt-4 text-sm text-gray-500">{{ t('checkout.loadingLoyalty') }}</div>
          <div v-else-if="!availableLoyaltyPoints || !loyaltyValuePerPoint" role="status" class="mt-4 text-sm text-gray-500">
            {{ t('checkout.noLoyalty') }}
          </div>
          <div v-else class="mt-4 space-y-3">
            <label for="use-loyalty-points" class="flex items-center gap-2 text-sm text-gray-700">
              <input id="use-loyalty-points" type="checkbox" class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50" v-model="useLoyaltyPoints" />
              {{ t('checkout.redeemPoints') }}
            </label>

            <div v-if="useLoyaltyPoints" class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <label for="loyalty-points-to-redeem" class="sr-only">{{ t('checkout.loyaltyPointsLabel') }}</label>
              <input
                id="loyalty-points-to-redeem"
                v-model.number="loyaltyPointsToRedeem"
                type="number"
                min="0"
                :max="maxUsableLoyaltyPoints"
                step="1"
                :aria-label="t('checkout.loyaltyPointsLabel')"
                aria-describedby="loyalty-points-help"
                class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
              />
              <button type="button" @click="applyMaxLoyalty"
                class="rounded-lg border border-[#00bfa5] px-4 py-2 text-sm font-semibold text-[#00a891] hover:bg-teal-50">
                {{ t('checkout.useMax') }}
              </button>
            </div>
            <p v-if="useLoyaltyPoints" id="loyalty-points-help" class="text-xs text-gray-500">
              {{ t('checkout.maxPoints', { count: maxUsableLoyaltyPoints.toLocaleString() }) }}
            </p>

            <div v-if="useLoyaltyPoints" class="rounded-lg bg-white border px-3 py-2 text-sm text-gray-700">
              <div class="flex justify-between">
                <span>{{ t('checkout.pointsToRedeem') }}</span>
                <span>{{ effectiveLoyaltyPoints.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between mt-1">
                <span>{{ t('checkout.loyaltyDiscount') }}</span>
                <span class="font-semibold text-red-600">- {{ t('common.omr') }} {{ loyaltyDiscount.toFixed(3) }}</span>
              </div>
            </div>
          </div>
        </div>



        <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 text-lg mb-4">{{ t('checkout.choosePaymentMethod') }}</h3>

          <div v-if="amwalMessage && !pendingAmwalOrder" role="alert" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ amwalMessage }}
          </div>

          <div
            v-if="transferInvalid"
            id="payment-error-summary"
            role="alert"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ t('checkout.paymentErrorSummary') }}
          </div>

          <div v-if="payableGrand <= 0 && !pendingAmwalOrder" class="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {{ t('checkout.coveredByLoyalty') }}
          </div>

          <!-- Accordion / radio list -->
          <div v-if="payableGrand > 0 || pendingAmwalOrder" class="space-y-3" role="radiogroup" :aria-label="t('checkout.choosePaymentMethod')">

            <!-- Credit Card -->
            <div class="border rounded-lg bg-white overflow-hidden">
              <label
                for="payment-card"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'card' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-card"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="card"
                    v-model="paymentMethod"
                    :disabled="Boolean(pendingAmwalOrder)"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.payCard') })"
                    :aria-expanded="paymentMethod === 'card'"
                    aria-controls="payment-card-panel"
                  />
                  <span id="payment-card-label" class="font-medium text-gray-800">{{ t('checkout.payCard') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'card'" id="payment-card-panel" class="px-4 pb-4 pt-0 border-t" role="region" aria-labelledby="payment-card-label">
                  <div class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                    <div class="flex items-start gap-3">
                      <svg aria-hidden="true" class="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3zm-5 0h10a2 2 0 012 2v6H5v-6a2 2 0 012-2z" />
                      </svg>
                      <div>
                        <p class="font-semibold">{{ t('checkout.amwalHostedTitle') }}</p>
                        <p class="mt-1 leading-5">{{ t('checkout.amwalHostedHelp') }}</p>
                        <p class="mt-2 text-xs text-emerald-800">{{ t('checkout.amwalNoCardStorage') }}</p>
                      </div>
                    </div>
                  </div>

                  <div v-if="pendingAmwalOrder" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" role="status" aria-live="polite">
                    <p class="text-sm font-medium text-slate-800">{{ amwalMessage }}</p>
                    <div v-if="['failed', 'pending'].includes(amwalPhase)" class="mt-3 flex flex-wrap gap-2">
                      <button type="button" class="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:text-gray-400" :disabled="amwalOperationInFlight" @click="checkPendingAmwalPayment">
                        {{ t('checkout.amwalCheckStatus') }}
                      </button>
                      <button type="button" class="rounded-md bg-[#00bfa5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#009c89] disabled:bg-gray-300" :disabled="amwalOperationInFlight" @click="cancelAndEditPendingOrder">
                        {{ t('checkout.amwalRestoreCart') }}
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Cash on Delivery -->
            <div class="border rounded-lg bg-white overflow-hidden" v-if="!pendingAmwalOrder && (codsupported?.cod_supported || deliveryMethods==='pickup')">
              <label
                for="payment-cod"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'cod' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-cod"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="cod"
                    v-model="paymentMethod"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.cashOnDelivery') })"
                    :aria-expanded="paymentMethod === 'cod'"
                    aria-controls="payment-cod-panel"
                  />
                  <span id="payment-cod-label" class="font-medium text-gray-800">{{ t('checkout.cashOnDelivery') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'cod'" id="payment-cod-panel" class="px-4 pb-4 pt-0 border-t text-sm text-gray-600" role="region" aria-labelledby="payment-cod-label">
                  {{ t('checkout.codHelp') }}
                </div>
              </transition>
            </div>

            <!-- Bank Transfer -->
            <div v-if="!pendingAmwalOrder" class="border rounded-lg bg-white overflow-hidden">
              <label
                for="payment-transfer"
                class="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                :class="paymentMethod === 'transfer' ? 'bg-teal-50/40' : ''">
                <div class="flex items-center gap-3">
                  <input
                    id="payment-transfer"
                    type="radio"
                    class="accent-[#00bfa5] focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50"
                    value="transfer"
                    v-model="paymentMethod"
                    :aria-label="t('checkout.selectPayment', { method: t('checkout.bankTransfer') })"
                    :aria-expanded="paymentMethod === 'transfer'"
                    aria-controls="payment-transfer-panel"
                  />
                  <span id="payment-transfer-label" class="font-medium text-gray-800">{{ t('checkout.bankTransfer') }}</span>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>

              <transition name="fade">
                <div v-if="paymentMethod === 'transfer'" id="payment-transfer-panel" class="px-4 pb-4 pt-0 border-t" role="region" aria-labelledby="payment-transfer-label">
                  <div class="text-sm text-gray-700 space-y-2">
                    <p class="font-medium">{{ t('checkout.transferTo') }}</p>
                    <ul class="text-gray-600 text-sm">
                      <li>Bank: <span class="font-medium">Bank Muscat</span></li>
                      <li>Account Name: <span class="font-medium">Kasr Althqt LTljart EST</span></li>
                      <li>IBAN: <span class="font-medium">OMxx 0000 0000 0000 0000</span></li>
                    </ul>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label for="transfer-reference" class="sr-only">{{ t('checkout.transferReference') }}</label>
                      <input v-bind="fieldA11y({ id: 'transfer-reference', invalid: transferInvalid })" v-model.trim="transfer.reference" :placeholder="t('checkout.transferReference')"
                        :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', transferInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p v-if="transferInvalid" id="transfer-reference-error" class="sr-only">{{ t('checkout.transferError') }}</p>
                    </div>
                    <div>
                      <label for="transfer-payer-name" class="sr-only">{{ t('checkout.payerFullName') }}</label>
                      <input v-bind="fieldA11y({ id: 'transfer-payer-name', invalid: transferInvalid })" v-model.trim="transfer.payerName" :placeholder="t('checkout.payerFullName')"
                        :class="['w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', transferInvalid ? 'border-red-500 focus:ring-red-500/60' : 'border-gray-300 focus:ring-[#00bfa5]/50']" />
                      <p v-if="transferInvalid" id="transfer-payer-name-error" class="sr-only">{{ t('checkout.transferError') }}</p>
                    </div>
                  </div>
                  <p v-if="transferInvalid" class="text-xs text-red-600 mt-2">
                    {{ t('checkout.transferError') }}
                  </p>
                </div>
              </transition>
            </div>
          </div>
        </div>



      </div>


      <!-- Right Column: Order Summary -->
      <div class="bg-gray-50 border rounded-lg p-5 shadow-sm">

        <h3 class="font-semibold text-gray-800 text-lg mb-1">{{ t('checkout.shippingTo') }}</h3>
        <template v-if="pendingAmwalOrder">
          <p v-if="pendingFulfillmentText" class="whitespace-pre-line text-sm text-gray-600">{{ pendingFulfillmentText }}</p>
          <p v-else class="text-sm text-gray-500">
            {{ t('checkout.amwalOrderReference', { reference: pendingAmwalOrder.orderCode || pendingAmwalOrder.orderId }) }}
          </p>
        </template>
        <template v-else>
          <p class="text-sm text-gray-600" v-if="selectedAddress">
            {{ [contactTitle(selectedAddress), selectedAddress.Contact_Person_Name].filter(Boolean).join(' ') }}<br>
            {{ formatPhone(selectedAddress.Telephone_Country_Code, selectedAddress.Telephone) }}<br>
            {{ field(selectedAddress.country, 'Country_Name') }}, {{ field(selectedAddress.region, 'Region_Name') }}, {{
              field(selectedAddress.district, 'District_Name') }} , {{ field(selectedAddress.city, 'City_Name') }},
          </p>
          <p class="text-sm text-gray-400" v-else>
            {{ t('checkout.noAddressSelected') }}
          </p>
        </template>
        <br>
        <!-- Order Summary -->
        <h3 class="text-lg font-semibold mb-4">{{ t('checkout.orderSummary') }}</h3>
        <div class="space-y-2 text-sm text-gray-700">
          <p v-if="!orderSummaryReady" class="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700" role="status">
            {{ t('checkout.verifyingTotals') }}
          </p>
          <template v-else>
            <div v-if="displayedProductDiscount > 0" class="flex justify-between text-gray-500">
              <span>{{ t('cart.itemsBeforeDiscount') }}</span>
              <span>{{ t('common.omr') }} {{ displayedOriginalSubtotal.toFixed(3) }}</span>
            </div>
            <div v-if="displayedProductDiscount > 0" class="flex justify-between text-emerald-700">
              <span>{{ t('cart.productDiscount') }}</span>
              <span>- {{ t('common.omr') }} {{ displayedProductDiscount.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('product.subTotal') }}</span>
              <span>{{ t('common.omr') }} {{ displayedSubtotal.toFixed(3) }}</span>
            </div>

            <div class="flex justify-between">
              <span>{{ t('nav.shipping') }}</span>
              <span>{{ t('common.omr') }} {{ displayedShippingCost.toFixed(3) }}</span>
            </div>
            <div class="flex justify-between">
              <span>VAT ({{ (cart.vat * 100).toFixed(1) }}%)</span>
              <span>{{ t('common.omr') }} {{ displayedVat.toFixed(3) }}</span>
            </div>
            <div v-if="displayedLoyaltyDiscount > 0" class="flex justify-between text-red-600">
              <span>{{ t('checkout.loyaltyDiscount') }}</span>
              <span>- {{ t('common.omr') }} {{ displayedLoyaltyDiscount.toFixed(3) }}</span>
            </div>
            <hr class="my-3" />
            <div class="flex justify-between font-semibold text-[#00bfa5] text-base">
              <span>{{ displayedLoyaltyDiscount > 0 || pendingAmwalOrder ? t('checkout.totalPayable') : t('cart.total') }}</span>
              <span>{{ t('common.omr') }} {{ displayedPayableGrand.toFixed(3) }}</span>
            </div>
          </template>
        </div>

        <p class="mt-4 text-xs leading-5 text-gray-600">
          {{ t('checkout.policyNotice').split('{terms}')[0] }}
          <NuxtLink to="/policies/terms" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('footer.terms') }}</NuxtLink>,
          <NuxtLink to="/policies/privacy" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('footer.privacy') }}</NuxtLink>,
          <NuxtLink to="/policies/shipping" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('policy.shipping') }}</NuxtLink>,
          <NuxtLink to="/policies/returns" class="font-medium text-cyan-700 hover:text-cyan-900">{{ t('policy.returns') }}</NuxtLink>.
        </p>

        <!-- Submit Order -->
        <button v-if="!pendingAmwalOrder" type="button" :disabled="isSubmitting || !currentCheckoutReconciled || cart.cartItems.length === 0" :aria-describedby="transferInvalid ? 'payment-error-summary' : undefined" @click="submitOrder" class="mt-5 w-full text-white font-semibold py-2 rounded-lg text-sm transition
            bg-[#e53935] hover:bg-[#c62828] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed">
          <svg v-if="isSubmitting" class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>{{ isSubmitting ? t('checkout.processing') : (paymentMethod === 'card' ? t('checkout.paySecurely') : t('checkout.submitOrder')) }}</span>
        </button>


      </div>
    </div>
  </section>
</template>
