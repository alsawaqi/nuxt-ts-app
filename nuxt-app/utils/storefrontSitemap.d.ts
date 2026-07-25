export interface SeoSitemapRecord {
  slug?: string | null
  updated_at?: string | null
}

export interface SeoSitemapPayload {
  categories: SeoSitemapRecord[]
  products: SeoSitemapRecord[]
}

export interface SitemapAlternate {
  hreflang: 'en-OM' | 'ar-OM' | 'x-default'
  href: string
}

export interface LocalizedSitemapEntry {
  loc: string
  alternates: SitemapAlternate[]
  lastmod?: string
  changefreq?: string
  priority?: number
}

export function normalizeSitemapLastmod(value?: string | null): string | undefined
export function isSeoSitemapPayload(value: unknown): value is SeoSitemapPayload
export function buildLocalizedSitemapEntries(options: {
  siteUrl: string
  categories?: SeoSitemapRecord[]
  products?: SeoSitemapRecord[]
}): LocalizedSitemapEntry[]
export function localizedSitemapXml(entries: LocalizedSitemapEntry[]): string
