const money = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount.toFixed(3) : null
}

const toBaisa = value => {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 1000) : null
}

const fromBaisa = value => Number((value / 1000).toFixed(3))

export const normalizeCheckoutItems = (items = []) => items
  .map(item => ({
    id: Number(item?.id ?? item?.product_id),
    quantity: Number(item?.quantity ?? item?.qty),
    price: money(item?.price ?? item?.unit_price),
  }))
  .filter(item => Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.price !== null)
  .sort((a, b) => a.id - b.id)

export const checkoutItemsMatch = (savedItems = [], currentItems = []) => (
  JSON.stringify(normalizeCheckoutItems(savedItems)) === JSON.stringify(normalizeCheckoutItems(currentItems))
)

export const pendingCheckoutIdentityFromRaw = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null

  try {
    const parsed = JSON.parse(raw)
    const orderId = Number(parsed?.orderId)
    if (!Number.isInteger(orderId) || orderId <= 0) return null

    const identity = {
      orderId,
      checkoutKey: typeof parsed?.checkoutKey === 'string' ? parsed.checkoutKey.trim() : '',
    }
    const ownerTabId = typeof parsed?.ownerTabId === 'string' ? parsed.ownerTabId.trim() : ''
    if (ownerTabId) identity.ownerTabId = ownerTabId
    return identity
  } catch {
    return null
  }
}

export const pendingCheckoutKeyFromRaw = raw => pendingCheckoutIdentityFromRaw(raw)?.checkoutKey || ''

export const pendingCheckoutIdentityMatches = (expected, actual) => {
  const expectedOrderId = Number(expected?.orderId)
  const actualOrderId = Number(actual?.orderId)
  if (!Number.isInteger(expectedOrderId) || expectedOrderId <= 0 || expectedOrderId !== actualOrderId) return false

  const expectedKey = typeof expected?.checkoutKey === 'string' ? expected.checkoutKey.trim() : ''
  const actualKey = typeof actual?.checkoutKey === 'string' ? actual.checkoutKey.trim() : ''
  if (expectedKey ? expectedKey !== actualKey : Boolean(actualKey)) return false

  const expectedOwner = typeof expected?.ownerTabId === 'string' ? expected.ownerTabId.trim() : ''
  const actualOwner = typeof actual?.ownerTabId === 'string' ? actual.ownerTabId.trim() : ''
  return expectedOwner ? expectedOwner === actualOwner : !actualOwner
}

export const pendingCheckoutBelongsToTab = (pending, tabId) => {
  const owner = typeof pending?.ownerTabId === 'string' ? pending.ownerTabId.trim() : ''
  const tab = typeof tabId === 'string' ? tabId.trim() : ''
  return Boolean(tab && (!owner || owner === tab))
}

export const checkoutCreationJournalFromRaw = (raw) => {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    const checkoutKey = typeof parsed?.checkoutKey === 'string' ? parsed.checkoutKey.trim() : ''
    const ownerTabId = typeof parsed?.ownerTabId === 'string' ? parsed.ownerTabId.trim() : ''
    const createdAt = Number(parsed?.createdAt)
    if (!checkoutKey || !ownerTabId || !Number.isFinite(createdAt) || createdAt <= 0) return null
    return { checkoutKey, ownerTabId, createdAt }
  } catch {
    return null
  }
}

export const checkoutCreationJournalMatches = (expected, actual) => Boolean(
  expected
  && actual
  && expected.checkoutKey === actual.checkoutKey
  && expected.ownerTabId === actual.ownerTabId,
)

export const pendingCheckoutMarkerRelation = (expected, actual) => {
  if (!actual) return 'missing'
  return pendingCheckoutIdentityMatches(expected, actual) ? 'same' : 'replaced'
}

export const legacyCheckoutMigrationOwner = ({
  pendingKey,
  savedKey,
  storedKey,
  prefillKey,
} = {}) => {
  const pending = typeof pendingKey === 'string' ? pendingKey.trim() : ''
  if (pending) return ''

  const saved = typeof savedKey === 'string' ? savedKey.trim() : ''
  const stored = typeof storedKey === 'string' ? storedKey.trim() : ''
  const prefill = typeof prefillKey === 'string' ? prefillKey.trim() : ''

  return saved && saved === stored && saved === prefill ? saved : ''
}

export const cartRestorationIsSafe = restoration => Boolean(
  restoration?.performed === true
  && restoration?.review_required !== true
)

export const classifyPendingPayment = (payment) => {
  const statuses = [payment?.status, payment?.order_status, payment?.attempt_status]
    .map(value => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)

  if (payment?.requires_review === true || statuses.includes('paid_requires_review')) {
    return 'review'
  }

  if (payment?.paid === true || statuses.includes('paid')) return 'paid'

  if (statuses.includes('cancelled') || payment?.payable === false) return 'terminal'

  return 'unpaid'
}

export const classifyPendingRecovery = (payment) => {
  const outcome = classifyPendingPayment(payment)
  if (outcome === 'paid' || outcome === 'review') return 'orders'
  if (outcome === 'terminal') {
    return cartRestorationIsSafe(payment?.cart_restoration) ? 'cart' : 'retain'
  }
  return 'cancel'
}

export const shouldPersistCheckout = (items = []) => normalizeCheckoutItems(items).length > 0

export const shouldReuseCheckoutKey = ({
  storedKey,
  storedSignature,
  signature,
  pendingKey,
  hasPendingRecord,
  hasItems,
} = {}) => Boolean(
  hasItems
  && storedKey
  && storedSignature === signature
  && (!hasPendingRecord || Boolean(pendingKey && storedKey !== pendingKey))
)

export const checkoutStateOwnership = ({ ownerKey, storedKey, prefillKey } = {}) => {
  const owner = typeof ownerKey === 'string' ? ownerKey.trim() : ''

  return {
    ownsStoredKey: Boolean(owner && owner === storedKey),
    ownsPrefill: Boolean(owner && owner === prefillKey),
  }
}

export const deriveCheckoutTotals = ({
  originalSubtotal,
  productDiscount,
  subtotal,
  shipping = 0,
  vatRate = 0,
} = {}) => {
  const subtotalBaisa = toBaisa(subtotal)
  const shippingBaisa = toBaisa(shipping)
  const rate = Number(vatRate)

  if (subtotalBaisa === null || shippingBaisa === null || !Number.isFinite(rate) || rate < 0) {
    return null
  }

  const vatBaisa = Math.round((subtotalBaisa + shippingBaisa) * rate)
  const originalBaisa = toBaisa(originalSubtotal)
  const discountBaisa = toBaisa(productDiscount)

  return {
    original_subtotal: fromBaisa(originalBaisa ?? subtotalBaisa),
    product_discount: fromBaisa(discountBaisa ?? Math.max((originalBaisa ?? subtotalBaisa) - subtotalBaisa, 0)),
    subtotal: fromBaisa(subtotalBaisa),
    shipping: fromBaisa(shippingBaisa),
    vat: fromBaisa(vatBaisa),
    grand: fromBaisa(subtotalBaisa + shippingBaisa + vatBaisa),
  }
}

export const checkoutTotalsMatch = (savedTotals, expectedTotals) => {
  if (!savedTotals || !expectedTotals) return false

  return ['subtotal', 'shipping', 'vat', 'grand']
    .every(key => toBaisa(savedTotals[key]) === toBaisa(expectedTotals[key]))
}

export const reconcileCheckoutTotals = (savedTotals, expectedTotals) => {
  if (!expectedTotals) return null
  if (checkoutTotalsMatch(savedTotals, expectedTotals)) return savedTotals

  return {
    ...(savedTotals || {}),
    ...expectedTotals,
  }
}
