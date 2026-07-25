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
import {
  isLocalizedPublicPath,
  localeFromPath,
  localizedPath,
} from '~/utils/storefrontSeo.js'

const cookieName = 'isc_storefront_locale'
const storageKey = 'isc_storefront_locale'

export const useStorefrontLocale = () => {
  const route = useRoute()
  const routeLocale = isLocalizedPublicPath(route.path)
    ? normalizeLocale(localeFromPath(route.path))
    : null
  const cookie = useCookie<StorefrontLocale>(cookieName, {
    default: () => routeLocale || 'en',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const locale = useState<StorefrontLocale>('storefront-locale', () => routeLocale || normalizeLocale(cookie.value))

  if (locale.value !== normalizeLocale(locale.value)) {
    locale.value = 'en'
  }

  if (routeLocale && locale.value !== routeLocale) {
    locale.value = routeLocale
    cookie.value = routeLocale
  }

  const setLocale = async (next: string) => {
    const normalized = normalizeLocale(next)
    locale.value = normalized
    cookie.value = normalized

    if (import.meta.client) {
      window.localStorage.setItem(storageKey, normalized)
    }

    if (isLocalizedPublicPath(route.path)) {
      const nextPath = localizedPath(route.path, normalized)
      if (nextPath !== route.path) {
        await navigateTo({
          path: nextPath,
          query: route.query,
          hash: route.hash,
        })
      }
    }
  }

  const toggleLocale = () => setLocale(locale.value === 'ar' ? 'en' : 'ar')
  const localePath = (path: string, targetLocale: StorefrontLocale = locale.value) => (
    localizedPath(path, normalizeLocale(targetLocale))
  )
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
    if (isLocalizedPublicPath(route.path)) return

    const stored = window.localStorage.getItem(storageKey)
    if (stored && normalizeLocale(stored) !== locale.value) {
      setLocale(stored)
    }
  })

  watch(() => route.path, (path) => {
    if (!isLocalizedPublicPath(path)) return

    const next = normalizeLocale(localeFromPath(path))
    if (locale.value !== next) {
      locale.value = next
      cookie.value = next
    }
  }, { immediate: true })

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
    localePath,
    t,
    field,
    productName,
    productText,
    categoryName,
    categoryText,
  }
}
