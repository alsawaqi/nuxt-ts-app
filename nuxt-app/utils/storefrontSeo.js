const trimSlashEnd = (value) => String(value || '').replace(/\/+$/, '')
const trimSlashStart = (value) => String(value || '').replace(/^\/+/, '')

const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const normalizePathname = (value = '/') => {
  const rawPath = String(value || '/').split('#')[0].split('?')[0] || '/'
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/')

  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/'
}

export const stripLocalePrefix = (path = '/') => {
  const normalized = normalizePathname(path)

  if (normalized === '/ar') return '/'
  return normalized.startsWith('/ar/') ? normalized.slice(3) || '/' : normalized
}

export const localeFromPath = (path = '/') => {
  const normalized = normalizePathname(path)
  return normalized === '/ar' || normalized.startsWith('/ar/') ? 'ar' : 'en'
}

export const localizedPath = (path = '/', locale = 'en') => {
  const raw = String(path || '/')
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const queryIndex = beforeHash.indexOf('?')
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : ''
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash
  const basePath = stripLocalePrefix(pathname)
  const localized = locale === 'ar'
    ? (basePath === '/' ? '/ar' : `/ar${basePath}`)
    : basePath

  return `${localized}${query}${hash}`
}

export const isLocalizedPublicPath = (path = '/') => {
  const normalized = stripLocalePrefix(path)

  return normalized === '/'
    || normalized === '/contact'
    || /^\/product\/[^/]+$/.test(normalized)
    || /^\/departments\/[^/]+$/.test(normalized)
    || /^\/policies\/[^/]+$/.test(normalized)
}

export const isNoIndexPath = (path = '/') => {
  const normalized = stripLocalePrefix(path)

  return normalized === '/account'
    || normalized.startsWith('/account/')
    || normalized === '/cart'
    || normalized.startsWith('/cart/')
    || [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/already-verified',
      '/verified-success',
      '/verify-error',
    ].includes(normalized)
}

export const canonicalUrl = (siteUrl, path = '/') => {
  const normalizedPath = normalizePathname(path)
  const base = trimSlashEnd(siteUrl)

  return base ? `${base}${normalizedPath}` : normalizedPath
}

export const assetUrl = (base, path) => {
  if (!path) return null
  const value = String(path)
  if (/^https?:\/\//i.test(value)) return value

  return `${trimSlashEnd(base)}/${trimSlashStart(value)}`
}

export const localizedAlternateLinks = (siteUrl, path = '/') => [
  { rel: 'alternate', hreflang: 'en-OM', href: canonicalUrl(siteUrl, localizedPath(path, 'en')) },
  { rel: 'alternate', hreflang: 'ar-OM', href: canonicalUrl(siteUrl, localizedPath(path, 'ar')) },
  { rel: 'alternate', hreflang: 'x-default', href: canonicalUrl(siteUrl, localizedPath(path, 'en')) },
]

export const openGraphLocale = (locale = 'en') => locale === 'ar' ? 'ar_OM' : 'en_OM'

const productName = (product) => compact(product?.Product_Name || product?.name || product?.Search_Title)
const productDescription = (product) => compact(product?.Product_Description || product?.description || productName(product))
const productPrice = (product) => {
  const value = product?.Product_Final_Price ?? product?.final_price ?? product?.Product_Price ?? product?.price ?? 0
  const number = Number(value)

  return Number.isFinite(number) ? number.toFixed(3) : '0.000'
}

const productSlug = (product) => product?.Slug || product?.slug
const productImages = (product, r2Url = '') => {
  const imagePaths = Array.isArray(product?.images)
    ? product.images.map((image) => image?.Image_Path || image?.image || image?.url)
    : [product?.image?.Image_Path || product?.image]

  return imagePaths.map((image) => assetUrl(r2Url, image)).filter(Boolean)
}

export const productJsonLd = ({ product, reviewSummary, siteUrl = '', r2Url = '' }) => {
  const slug = productSlug(product)
  const stock = Number(product?.Product_Stock ?? product?.stock ?? 0)
  const sku = compact(product?.Product_Sku || product?.Product_Code || product?.Inhouse_Barcode_Source)
  const brand = compact(
    product?.brand?.Brand_Name
      || product?.brand?.name
      || product?.Product_Brand_Name
      || product?.Brand_Name
  )
  const url = canonicalUrl(siteUrl, slug ? `/product/${slug}` : '/')

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName(product),
    description: productDescription(product),
    url,
    image: productImages(product, r2Url),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'OMR',
      price: productPrice(product),
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@id': `${canonicalUrl(siteUrl, '/')}#organization`,
      },
    },
  }

  if (sku) data.sku = sku
  if (brand) {
    data.brand = {
      '@type': 'Brand',
      name: brand,
    }
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

export const organizationJsonLd = ({
  siteUrl = '',
  name = 'Industrial Supplies Center LLC',
  logoPath = '/logonew1.png',
  email,
  telephone,
} = {}) => {
  const url = canonicalUrl(siteUrl, '/')
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: compact(name),
    alternateName: 'ISC Depot',
    url,
    logo: assetUrl(siteUrl, logoPath),
  }

  if (compact(email)) data.email = compact(email)
  if (compact(telephone)) data.telephone = compact(telephone)

  return data
}

export const websiteJsonLd = ({
  siteUrl = '',
  name = 'ISC Depot',
  language = ['en', 'ar'],
} = {}) => {
  const url = canonicalUrl(siteUrl, '/')

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name: compact(name),
    url,
    inLanguage: language,
    publisher: {
      '@id': `${url}#organization`,
    },
  }
}

export const webPageJsonLd = ({
  siteUrl = '',
  path = '/',
  name = '',
  description = '',
  locale = 'en',
  type = 'WebPage',
} = {}) => ({
  '@context': 'https://schema.org',
  '@type': type,
  name: compact(name),
  description: compact(description),
  url: canonicalUrl(siteUrl, path),
  inLanguage: locale,
  isPartOf: {
    '@id': `${canonicalUrl(siteUrl, '/')}#website`,
  },
})

export const collectionPageJsonLd = ({
  siteUrl = '',
  path = '/',
  name = '',
  description = '',
  locale = 'en',
  products = [],
  r2Url = '',
} = {}) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: compact(name),
  description: compact(description),
  url: canonicalUrl(siteUrl, path),
  inLanguage: locale,
  isPartOf: {
    '@id': `${canonicalUrl(siteUrl, '/')}#website`,
  },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products
      .filter((product) => productSlug(product))
      .map((product, index) => {
        const images = productImages(product, r2Url)
        const item = {
          '@type': 'ListItem',
          position: index + 1,
          url: canonicalUrl(siteUrl, `/product/${productSlug(product)}`),
          name: productName(product),
        }

        if (images[0]) item.image = images[0]
        return item
      }),
  },
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
