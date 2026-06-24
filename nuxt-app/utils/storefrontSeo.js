const trimSlashEnd = (value) => String(value || '').replace(/\/+$/, '')
const trimSlashStart = (value) => String(value || '').replace(/^\/+/, '')

export const canonicalUrl = (siteUrl, path = '/') => {
  const cleanPath = String(path || '/').split('#')[0].split('?')[0] || '/'
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  const base = trimSlashEnd(siteUrl)

  return base ? `${base}${normalizedPath}` : normalizedPath
}

const absoluteAssetUrl = (base, path) => {
  if (!path) return null
  const value = String(path)
  if (/^https?:\/\//i.test(value)) return value

  return `${trimSlashEnd(base)}/${trimSlashStart(value)}`
}

const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const productName = (product) => compact(product?.Product_Name || product?.name || product?.Search_Title)
const productDescription = (product) => compact(product?.Product_Description || product?.description || productName(product))
const productPrice = (product) => {
  const value = product?.Product_Final_Price ?? product?.final_price ?? product?.Product_Price ?? product?.price ?? 0
  const number = Number(value)

  return Number.isFinite(number) ? number.toFixed(3) : '0.000'
}

export const productJsonLd = ({ product, reviewSummary, siteUrl = '', r2Url = '' }) => {
  const slug = product?.Slug || product?.slug
  const stock = Number(product?.Product_Stock ?? product?.stock ?? 0)
  const imagePaths = Array.isArray(product?.images)
    ? product.images.map((image) => image?.Image_Path || image?.image || image?.url)
    : [product?.image?.Image_Path || product?.image]

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName(product),
    description: productDescription(product),
    sku: compact(product?.Product_Sku || product?.Product_Code || product?.Inhouse_Barcode_Source),
    image: imagePaths.map((image) => absoluteAssetUrl(r2Url, image)).filter(Boolean),
    offers: {
      '@type': 'Offer',
      url: canonicalUrl(siteUrl, slug ? `/product/${slug}` : '/'),
      priceCurrency: 'OMR',
      price: productPrice(product),
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  const ratingCount = Number(reviewSummary?.review_count || 0)
  if (ratingCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(reviewSummary?.average_rating || '0.00'),
      reviewCount: ratingCount,
    }
  }

  return data
}

export const breadcrumbJsonLd = (items, siteUrl = '') => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: (items || [])
    .filter((item) => item?.name)
    .map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: compact(item.name),
      item: canonicalUrl(siteUrl, item.path || '/'),
    })),
})

export const seoTitle = (title, suffix = 'ISC Depot') => {
  const cleanTitle = compact(title)

  return cleanTitle ? `${cleanTitle} | ${suffix}` : suffix
}

export const seoDescription = (description, fallback = 'Industrial supplies, tools, parts, and equipment from ISC Depot.') => {
  const text = compact(description || fallback)

  return text.length > 158 ? `${text.slice(0, 155).trim()}...` : text
}

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

export const sitemapXml = (entries) => {
  const urls = (entries || [])
    .filter((entry) => entry?.loc)
    .map((entry) => {
      const tags = [
        `<loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
        entry.changefreq ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>` : '',
        entry.priority != null ? `<priority>${escapeXml(entry.priority)}</priority>` : '',
      ].filter(Boolean).join('')

      return `<url>${tags}</url>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}
