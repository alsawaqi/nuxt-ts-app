import test from 'node:test'
import assert from 'node:assert/strict'
import { offerKey, offerSelection, sameOffer } from '../utils/offerIdentity.js'
import { checkoutItemsMatch, normalizeCheckoutItems } from '../utils/checkoutState.js'

test('same product from two vendors has independent cart identities', () => {
  assert.notEqual(offerKey({ id: 10, vendorOfferId: 1 }), offerKey({ id: 10, vendorOfferId: 2 }))
  assert.notEqual(offerKey({ id: 10 }), offerKey({ id: 10, vendorOfferId: 1 }))
  assert.equal(sameOffer({ id: '10', vendorOfferId: '2' }, { id: 10, vendorOfferId: 2 }), true)
  assert.deepEqual(offerSelection(offerKey({ id: 10, vendorOfferId: 2 })), { product_id: 10, vendor_offer_id: 2 })
  assert.deepEqual(offerSelection(offerKey({ id: 10 })), { product_id: 10, vendor_offer_id: null })
})

test('checkout identity changes when only seller changes, even at the same price', () => {
  const first = [{ id: 10, vendorOfferId: 1, quantity: 2, price: 5 }]
  const second = [{ id: 10, vendor_offer_id: 2, quantity: 2, price: 5 }]
  assert.equal(checkoutItemsMatch(first, second), false)
  const combined = [...first, ...second]
  assert.equal(checkoutItemsMatch(combined, combined.toReversed()), true)
  assert.equal(normalizeCheckoutItems(combined).length, 2)
})
