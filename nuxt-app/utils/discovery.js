const numberValue = (value, fallback = 0) => {
  const number = Number(value ?? fallback)

  return Number.isFinite(number) ? number : fallback
}

export const productSearchText = (product) => {
  const specLabels = Object.values(product?.specs || {})
    .map((spec) => spec?.label)
    .filter(Boolean)

  return [
    product?.Product_Name,
    product?.Product_Name_Ar,
    product?.name,
    product?.name_ar,
    product?.Product_Code,
    product?.Product_Sku,
    product?.Inhouse_Barcode_Source,
    ...specLabels,
  ]
    .filter(Boolean)
    .join(' ')
}

export const filterAndSortProducts = (products, options = {}) => {
  const query = String(options.query || '').trim().toLowerCase()
  const sort = options.sort || 'relevance'

  const filtered = (products || []).filter((product) => {
    if (query && !productSearchText(product).toLowerCase().includes(query)) return false
    if (options.inStockOnly && numberValue(product?.Product_Stock ?? product?.stock) <= 0) return false
    if (options.onSaleOnly && !Boolean(product?.has_discount ?? product?.Has_Discount)) return false

    return true
  })

  return [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return numberValue(a.final_price ?? a.price) - numberValue(b.final_price ?? b.price)
    if (sort === 'price_desc') return numberValue(b.final_price ?? b.price) - numberValue(a.final_price ?? a.price)
    if (sort === 'rating_desc') {
      return numberValue(b.review_summary?.average_rating) - numberValue(a.review_summary?.average_rating)
        || numberValue(b.review_summary?.review_count) - numberValue(a.review_summary?.review_count)
    }
    if (sort === 'newest') return numberValue(b.id) - numberValue(a.id)

    return 0
  })
}

const recentlyViewedProduct = (product) => Object.fromEntries(
  Object.entries({
    id: product?.id,
    vendor_offer_id: product?.vendor_offer_id ?? product?.Vendor_Offer_Id,
    slug: product?.slug || product?.Slug,
    name: product?.name || product?.Product_Name,
    name_ar: product?.name_ar || product?.Product_Name_Ar,
    image: product?.image || product?.images?.[0]?.Image_Path || product?.image?.Image_Path,
    price: product?.price ?? product?.final_price ?? product?.Product_Final_Price ?? product?.Product_Price,
  }).filter(([, value]) => value != null && value !== '')
)

export const updateRecentlyViewed = (items, product, max = 8) => {
  const current = recentlyViewedProduct(product)
  const key = current.id != null ? 'id' : 'slug'
  const currentKey = current[key]

  if (currentKey == null || currentKey === '') return (items || []).slice(0, max)

  return [
    current,
    ...(items || []).filter((item) => item?.[key] !== currentKey),
  ].slice(0, max)
}

export const readRecentlyViewed = (storage, key = 'isc_recently_viewed_products') => {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || '[]')

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeRecentlyViewed = (storage, items, key = 'isc_recently_viewed_products') => {
  storage?.setItem(key, JSON.stringify(items || []))
}
