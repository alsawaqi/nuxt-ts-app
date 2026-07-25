export type StorefrontSeoLocale = 'en' | 'ar'

export function normalizePathname(path?: string): string
export function stripLocalePrefix(path?: string): string
export function localeFromPath(path?: string): StorefrontSeoLocale
export function localizedPath(path?: string, locale?: StorefrontSeoLocale): string
export function isLocalizedPublicPath(path?: string): boolean
export function isNoIndexPath(path?: string): boolean
export function canonicalUrl(siteUrl: string, path?: string): string
export function assetUrl(base: string, path?: string | null): string | null
export function localizedAlternateLinks(siteUrl: string, path?: string): Array<{
  rel: 'alternate'
  hreflang: 'en-OM' | 'ar-OM' | 'x-default'
  href: string
}>
export function openGraphLocale(locale?: StorefrontSeoLocale): 'en_OM' | 'ar_OM'
export function productJsonLd(options: {
  product: Record<string, any>
  reviewSummary?: Record<string, any> | null
  siteUrl?: string
  r2Url?: string
}): Record<string, any>
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, siteUrl?: string): Record<string, any>
export function organizationJsonLd(options?: {
  siteUrl?: string
  name?: string
  logoPath?: string
  email?: string
  telephone?: string
}): Record<string, any>
export function websiteJsonLd(options?: {
  siteUrl?: string
  name?: string
  language?: string[]
}): Record<string, any>
export function webPageJsonLd(options?: {
  siteUrl?: string
  path?: string
  name?: string
  description?: string
  locale?: StorefrontSeoLocale
  type?: string
}): Record<string, any>
export function collectionPageJsonLd(options?: {
  siteUrl?: string
  path?: string
  name?: string
  description?: string
  locale?: StorefrontSeoLocale
  products?: Array<Record<string, any>>
  r2Url?: string
}): Record<string, any>
export function seoTitle(title?: string, suffix?: string): string
export function seoDescription(description?: string, fallback?: string): string
export function sitemapXml(entries: Array<{
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: number | string
}>): string
