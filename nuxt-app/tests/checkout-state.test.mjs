import test from 'node:test'
import assert from 'node:assert/strict'

import {
  cartRestorationIsSafe,
  checkoutCreationJournalFromRaw,
  checkoutCreationJournalMatches,
  classifyPendingPayment,
  classifyPendingRecovery,
  checkoutStateOwnership,
  checkoutItemsMatch,
  checkoutTotalsMatch,
  deriveCheckoutTotals,
  normalizeCheckoutItems,
  legacyCheckoutMigrationOwner,
  pendingCheckoutBelongsToTab,
  pendingCheckoutIdentityFromRaw,
  pendingCheckoutIdentityMatches,
  pendingCheckoutMarkerRelation,
  pendingCheckoutKeyFromRaw,
  reconcileCheckoutTotals,
  shouldPersistCheckout,
  shouldReuseCheckoutKey,
} from '../utils/checkoutState.js'

test('pending payment classification prioritizes captured-review races', () => {
  assert.equal(classifyPendingPayment({ paid: true, status: 'paid_requires_review' }), 'review')
  assert.equal(classifyPendingPayment({ attempt_status: 'PAID_REQUIRES_REVIEW' }), 'review')
  assert.equal(classifyPendingPayment({ paid: true, status: 'paid' }), 'paid')
  assert.equal(classifyPendingPayment({ status: 'cancelled', payable: false }), 'terminal')
  assert.equal(classifyPendingPayment({ status: 'pending', payable: true }), 'unpaid')
})

test('pending recovery separates captured, safely restored, and unresolved terminal states', () => {
  assert.equal(classifyPendingRecovery({ paid: true, status: 'paid' }), 'orders')
  assert.equal(classifyPendingRecovery({ status: 'paid_requires_review' }), 'orders')
  assert.equal(classifyPendingRecovery({
    status: 'cancelled',
    payable: false,
    cart_restoration: { performed: true, review_required: false },
  }), 'cart')
  assert.equal(classifyPendingRecovery({ status: 'cancelled', payable: false }), 'retain')
  assert.equal(classifyPendingRecovery({ status: 'pending', payable: true }), 'cancel')
})

test('cart restoration is trusted only when the server confirms a clean restore', () => {
  assert.equal(cartRestorationIsSafe({ performed: true, review_required: false }), true)
  assert.equal(cartRestorationIsSafe({ performed: true }), true)
  assert.equal(cartRestorationIsSafe({ performed: true, review_required: true }), false)
  assert.equal(cartRestorationIsSafe({ performed: false, review_required: false }), false)
  assert.equal(cartRestorationIsSafe(null), false)
})

test('checkout item comparison is stable across ordering and money formats', () => {
  const saved = [
    { id: 9, qty: 2, price: 1.5 },
    { id: 4, qty: 1, price: '0.750' },
  ]
  const current = [
    { id: 4, quantity: 1, price: 0.75 },
    { id: 9, quantity: 2, price: '1.500' },
  ]

  assert.deepEqual(normalizeCheckoutItems(saved), normalizeCheckoutItems(current))
  assert.equal(checkoutItemsMatch(saved, current), true)
})

test('checkout item comparison detects product, quantity, and price changes', () => {
  const saved = [{ id: 4, qty: 1, price: 1.5 }]

  assert.equal(checkoutItemsMatch(saved, [{ id: 5, quantity: 1, price: 1.5 }]), false)
  assert.equal(checkoutItemsMatch(saved, [{ id: 4, quantity: 2, price: 1.5 }]), false)
  assert.equal(checkoutItemsMatch(saved, [{ id: 4, quantity: 1, price: 1.6 }]), false)
})

test('an empty cart never creates or rotates checkout state', () => {
  assert.equal(shouldPersistCheckout([]), false)
  assert.equal(shouldPersistCheckout([{ id: 4, quantity: 1, price: 1.5 }]), true)
})

test('a newer cart never reuses the pending payment key', () => {
  const rawPending = JSON.stringify({ checkoutKey: 'K1' })
  const validRawPending = JSON.stringify({ orderId: 7, checkoutKey: 'K1' })
  assert.equal(pendingCheckoutKeyFromRaw(rawPending), '')
  assert.equal(pendingCheckoutKeyFromRaw(validRawPending), 'K1')
  assert.equal(shouldReuseCheckoutKey({
    storedKey: 'K1',
    storedSignature: 'same-cart',
    signature: 'same-cart',
    pendingKey: 'K1',
    hasPendingRecord: true,
    hasItems: true,
  }), false)
  assert.equal(shouldReuseCheckoutKey({
    storedKey: 'K2',
    storedSignature: 'same-cart',
    signature: 'same-cart',
    pendingKey: 'K1',
    hasPendingRecord: true,
    hasItems: true,
  }), true)
})

test('a legacy pending record also forces a fresh checkout key', () => {
  const legacy = pendingCheckoutIdentityFromRaw(JSON.stringify({ orderId: 7 }))
  assert.deepEqual(legacy, { orderId: 7, checkoutKey: '' })
  assert.equal(shouldReuseCheckoutKey({
    storedKey: 'K1',
    storedSignature: 'same-cart',
    signature: 'same-cart',
    pendingKey: '',
    hasPendingRecord: true,
    hasItems: true,
  }), false)
})

test('a stale tab cannot own a newer pending order record', () => {
  assert.equal(pendingCheckoutIdentityMatches(
    { orderId: 7, checkoutKey: 'K1' },
    { orderId: 8, checkoutKey: 'K2' },
  ), false)
  assert.equal(pendingCheckoutIdentityMatches(
    { orderId: 8, checkoutKey: 'K2' },
    { orderId: 8, checkoutKey: 'K2' },
  ), true)
  assert.equal(pendingCheckoutIdentityMatches(
    { orderId: 8 },
    { orderId: 8, checkoutKey: 'K2' },
  ), false)

  assert.equal(pendingCheckoutMarkerRelation(
    { orderId: 8, checkoutKey: 'K2' },
    { orderId: 8, checkoutKey: 'K2' },
  ), 'same')
  assert.equal(pendingCheckoutMarkerRelation(
    { orderId: 8, checkoutKey: 'K2' },
    { orderId: 9, checkoutKey: 'K3' },
  ), 'replaced')
  assert.equal(pendingCheckoutMarkerRelation({ orderId: 8, checkoutKey: 'K2' }, null), 'missing')

  assert.equal(pendingCheckoutIdentityMatches(
    { orderId: 8, checkoutKey: 'K2', ownerTabId: 'TAB-A' },
    { orderId: 8, checkoutKey: 'K2', ownerTabId: 'TAB-B' },
  ), false)
  assert.equal(pendingCheckoutBelongsToTab({ orderId: 8, checkoutKey: 'K2' }, 'TAB-A'), true)
  assert.equal(pendingCheckoutBelongsToTab({ orderId: 8, checkoutKey: 'K2', ownerTabId: 'TAB-A' }, 'TAB-A'), true)
  assert.equal(pendingCheckoutBelongsToTab({ orderId: 8, checkoutKey: 'K2', ownerTabId: 'TAB-B' }, 'TAB-A'), false)
})

test('legacy checkout migration requires one matching owner across all guarded state', () => {
  assert.equal(legacyCheckoutMigrationOwner({
    pendingKey: '',
    savedKey: 'K1',
    storedKey: 'K1',
    prefillKey: 'K1',
  }), 'K1')
  assert.equal(legacyCheckoutMigrationOwner({
    pendingKey: 'K0',
    savedKey: 'K1',
    storedKey: 'K1',
    prefillKey: 'K1',
  }), '')
  assert.equal(legacyCheckoutMigrationOwner({
    pendingKey: '',
    savedKey: 'K1',
    storedKey: 'K2',
    prefillKey: 'K2',
  }), '')
})

test('creation journals contain only a guarded checkout identity', () => {
  const journal = checkoutCreationJournalFromRaw(JSON.stringify({
    checkoutKey: 'K1',
    ownerTabId: 'TAB-A',
    createdAt: 1234,
    ignored: 'not returned',
  }))
  assert.deepEqual(journal, { checkoutKey: 'K1', ownerTabId: 'TAB-A', createdAt: 1234 })
  assert.equal(checkoutCreationJournalFromRaw(JSON.stringify({ checkoutKey: 'K1' })), null)
  assert.equal(checkoutCreationJournalMatches(journal, { ...journal }), true)
  assert.equal(checkoutCreationJournalMatches(journal, { ...journal, ownerTabId: 'TAB-B' }), false)
})

test('checkout cleanup removes only state owned by its key', () => {
  assert.deepEqual(checkoutStateOwnership({ ownerKey: 'K1', storedKey: 'K2', prefillKey: 'K2' }), {
    ownsStoredKey: false,
    ownsPrefill: false,
  })
  assert.deepEqual(checkoutStateOwnership({ ownerKey: 'K1', storedKey: 'K1', prefillKey: 'K1' }), {
    ownsStoredKey: true,
    ownsPrefill: true,
  })
  assert.deepEqual(checkoutStateOwnership({ ownerKey: '', storedKey: 'K2', prefillKey: 'K2' }), {
    ownsStoredKey: false,
    ownsPrefill: false,
  })
})

test('current server cart totals replace a stale payable amount', () => {
  const expected = deriveCheckoutTotals({
    originalSubtotal: 1.5,
    productDiscount: 0,
    subtotal: 1.5,
    shipping: 0,
    vatRate: 0.05,
  })
  const stale = { currency: 'OMR', subtotal: 1.5, shipping: 0, vat: 0.075, grand: 10.5 }
  const reconciled = reconcileCheckoutTotals(stale, expected)

  assert.equal(checkoutTotalsMatch(stale, expected), false)
  assert.deepEqual(reconciled, {
    currency: 'OMR',
    original_subtotal: 1.5,
    product_discount: 0,
    subtotal: 1.5,
    shipping: 0,
    vat: 0.075,
    grand: 1.575,
  })
})

test('derived totals include shipping exactly once and round in baisa', () => {
  const expected = deriveCheckoutTotals({
    subtotal: 0.1,
    shipping: 0.2,
    vatRate: 0.05,
  })

  assert.deepEqual(expected, {
    original_subtotal: 0.1,
    product_discount: 0,
    subtotal: 0.1,
    shipping: 0.2,
    vat: 0.015,
    grand: 0.315,
  })
  assert.equal(checkoutTotalsMatch({ subtotal: 0.1, shipping: 0.2, vat: 0.015, grand: 0.315 }, expected), true)
})
