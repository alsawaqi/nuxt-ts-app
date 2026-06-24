export type StorefrontLocale = 'en' | 'ar'

export const supportedLocales: StorefrontLocale[]
export const localeMeta: Record<StorefrontLocale, {
  code: StorefrontLocale
  label: string
  shortLabel: string
  dir: 'ltr' | 'rtl'
}>
export const messages: Record<StorefrontLocale, Record<string, string>>

export function isSupportedLocale(locale: unknown): locale is StorefrontLocale
export function normalizeLocale(locale: unknown): StorefrontLocale
export function directionFor(locale: unknown): 'ltr' | 'rtl'
export function interpolate(text: string, params?: Record<string, unknown>): string
export function t(key: string, locale?: StorefrontLocale, params?: Record<string, unknown>): string
export function localizedField(source: unknown, fields: string | string[], locale?: StorefrontLocale, fallback?: string): string
export function productDisplayName(product: unknown, locale?: StorefrontLocale): string
export function productDescription(product: unknown, locale?: StorefrontLocale): string
export function categoryDisplayName(category: unknown, locale?: StorefrontLocale): string
export function categoryDescription(category: unknown, locale?: StorefrontLocale): string
