export function canonicalUrl(siteUrl: string, path?: string): string
export function productJsonLd(options: {
  product: Record<string, any>
  reviewSummary?: Record<string, any> | null
  siteUrl?: string
  r2Url?: string
}): Record<string, any>
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, siteUrl?: string): Record<string, any>
export function seoTitle(title?: string, suffix?: string): string
export function seoDescription(description?: string, fallback?: string): string
export function sitemapXml(entries: Array<{
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number | string
}>): string
