/** The product and seller together identify a purchasable cart line. */
export function offerKey(item) {
  return `${Number(item.id)}:${item.vendorOfferId == null ? 'own' : Number(item.vendorOfferId)}`
}

export function offerSelection(key) {
  const [product, offer] = String(key).split(':')
  return { product_id: Number(product), vendor_offer_id: offer === 'own' ? null : Number(offer) }
}

export function sameOffer(left, right) {
  return offerKey(left) === offerKey(right)
}
