import { computed, onMounted, watch } from 'vue'
import {
  categoryDescription,
  categoryDisplayName,
  directionFor,
  localizedField,
  localeMeta,
  normalizeLocale,
  productDescription,
  productDisplayName,
  t as translate,
} from '~/utils/storefrontI18n.js'
import type { StorefrontLocale } from '~/utils/storefrontI18n.js'

const cookieName = 'isc_storefront_locale'
const storageKey = 'isc_storefront_locale'

export const useStorefrontLocale = () => {
  const cookie = useCookie<StorefrontLocale>(cookieName, {
    default: () => 'en',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const locale = useState<StorefrontLocale>('storefront-locale', () => normalizeLocale(cookie.value))

  if (locale.value !== normalizeLocale(locale.value)) {
    locale.value = 'en'
  }

  const setLocale = (next: string) => {
    const normalized = normalizeLocale(next)
    locale.value = normalized
    cookie.value = normalized

    if (import.meta.client) {
      window.localStorage.setItem(storageKey, normalized)
    }
  }

  const toggleLocale = () => setLocale(locale.value === 'ar' ? 'en' : 'ar')
  const dir = computed(() => directionFor(locale.value))
  const isArabic = computed(() => locale.value === 'ar')
  const language = computed(() => localeMeta[locale.value])

  const t = (key: string, params: Record<string, unknown> = {}) => translate(key, locale.value, params)
  const field = (source: unknown, fields: string | string[], fallback = '') => localizedField(source, fields, locale.value, fallback)
  const productName = (product: unknown) => productDisplayName(product, locale.value)
  const productText = (product: unknown) => productDescription(product, locale.value)
  const categoryName = (category: unknown) => categoryDisplayName(category, locale.value)
  const categoryText = (category: unknown) => categoryDescription(category, locale.value)

  onMounted(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored && normalizeLocale(stored) !== locale.value) {
      setLocale(stored)
    }
  })

  watch(locale, (next) => {
    const normalized = normalizeLocale(next)
    cookie.value = normalized

    if (!import.meta.client) return

    window.localStorage.setItem(storageKey, normalized)
    document.documentElement.lang = normalized
    document.documentElement.dir = directionFor(normalized)
    document.body.classList.toggle('locale-ar', normalized === 'ar')
    document.body.classList.toggle('locale-en', normalized === 'en')
    document.body.classList.toggle('rtl', normalized === 'ar')
    document.body.classList.toggle('ltr', normalized === 'en')
  }, { immediate: true })

  useHead(() => ({
    htmlAttrs: {
      lang: locale.value,
      dir: dir.value,
    },
    bodyAttrs: {
      class: isArabic.value ? 'locale-ar rtl' : 'locale-en ltr',
    },
  }))

  return {
    locale,
    language,
    dir,
    isArabic,
    setLocale,
    toggleLocale,
    t,
    field,
    productName,
    productText,
    categoryName,
    categoryText,
  }
}
