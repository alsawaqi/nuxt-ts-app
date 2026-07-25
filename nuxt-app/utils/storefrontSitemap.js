import { canonicalUrl } from './storefrontSeo.js'

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: 1 },
  { path: '/contact', changefreq: 'monthly', priority: 0.5 },
  ...['shipping', 'returns', 'privacy', 'terms', 'warranty', 'faq'].map((slug) => ({
    path: `/policies/${slug}`,
    changefreq: 'monthly',
    priority: 0.4,
  })),
]

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const encodedSlug = (value) => {
  const slug = String(value ?? '').trim().replace(/^\/+|\/+$/g, '')
  return slug ? encodeURIComponent(slug) : ''
}

const localizedPath = (path, locale) => {
  if (locale !== 'ar') return path
  return path === '/' ? '/ar' : `/ar${path}`
}

const alternatesFor = (siteUrl, path) => {
  const english = canonicalUrl(siteUrl, localizedPath(path, 'en'))
  const arabic = canonicalUrl(siteUrl, localizedPath(path, 'ar'))

  return [
    { hreflang: 'en-OM', href: english },
    { hreflang: 'ar-OM', href: arabic },
    { hreflang: 'x-default', href: english },
  ]
}

export const normalizeSitemapLastmod = (value) => {
  if (value == null || String(value).trim() === '') return undefined

  const raw = String(value).trim()
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return undefined

  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : parsed.toISOString()
}

export const isSeoSitemapPayload = (value) => Boolean(
  value
  && typeof value === 'object'
  && Array.isArray(value.categories)
  && Array.isArray(value.products)
)

export const buildLocalizedSitemapEntries = ({
  siteUrl,
  categories = [],
  products = [],
} = {}) => {
  if (!/^https?:\/\//i.test(String(siteUrl || ''))) {
    throw new TypeError('A valid absolute site URL is required for the sitemap.')
  }

  const routeRecords = [
    ...STATIC_ROUTES,
    ...categories.map((category) => {
      const slug = encodedSlug(category?.slug)
      return slug
        ? {
            path: `/departments/${slug}`,
            lastmod: normalizeSitemapLastmod(category?.updated_at),
            changefreq: 'weekly',
            priority: 0.8,
          }
        : null
    }),
    ...products.map((product) => {
      const slug = encodedSlug(product?.slug)
      return slug
        ? {
            path: `/product/${slug}`,
            lastmod: normalizeSitemapLastmod(product?.updated_at),
            changefreq: 'weekly',
            priority: 0.7,
          }
        : null
    }),
  ].filter(Boolean)

  const entries = []
  const seen = new Set()

  for (const record of routeRecords) {
    const alternates = alternatesFor(siteUrl, record.path)

    for (const locale of ['en', 'ar']) {
      const loc = canonicalUrl(siteUrl, localizedPath(record.path, locale))
      if (seen.has(loc)) continue
      seen.add(loc)

      entries.push({
        loc,
        alternates,
        lastmod: record.lastmod,
        changefreq: record.changefreq,
        priority: record.priority,
      })
    }
  }

  return entries
}

export const localizedSitemapXml = (entries) => {
  const urls = (entries || [])
    .filter((entry) => entry?.loc)
    .map((entry) => {
      const alternates = (entry.alternates || [])
        .filter((alternate) => alternate?.hreflang && alternate?.href)
        .map((alternate) => (
          `<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>`
        ))
        .join('')

      const tags = [
        `<loc>${escapeXml(entry.loc)}</loc>`,
        alternates,
        entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
        entry.changefreq ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>` : '',
        entry.priority != null ? `<priority>${escapeXml(entry.priority)}</priority>` : '',
      ].filter(Boolean).join('')

      return `<url>${tags}</url>`
    })
    .join('')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
  ].join('')
}
