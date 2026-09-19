<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  alias: ['/ar/departments/:slug'],
})

import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { activeDescendantState } from '~/utils/accessibility.js'
import { filterAndSortProducts } from '~/utils/discovery.js'
import { formatRatingSummary, starStates } from '~/utils/productEngagement.js'
import { assetUrl, breadcrumbJsonLd, canonicalUrl, collectionPageJsonLd, localizedAlternateLinks, openGraphLocale, seoDescription, seoTitle } from '~/utils/storefrontSeo.js'
const { $axios, $r2Url } = useNuxtApp()
const config = useRuntimeConfig()
const { t, isArabic, locale, localePath, categoryName, categoryText, productName } = useStorefrontLocale()

const showFilters = ref(false);
const route = useRoute();
const slug = computed(() => String(route.params.slug || ''))

const isloadingsubsubdepartments = ref(true)
const isloadingproducts = ref(true)
const filtersError = ref('')
const productsError = ref('')


// read parent context from query (sent by index.vue link)
const parentDeptId = computed<number | null>(() =>
  route.query.deptId ? Number(route.query.deptId) : null
)
const parentSubId = computed<number | null>(() =>
  route.query.subId ? Number(route.query.subId) : null
)

const parentDeptRecord = ref<any | null>(null)
const parentSubRecord = ref<any | null>(null)
const parentDeptName = computed(() => categoryName(parentDeptRecord.value))
const parentSubName = computed(() => categoryName(parentSubRecord.value))


const router = useRouter()
const subsubdepartment = ref<SubSubDepartment | null>(null)





// fetch names for the breadcrumb, using your existing endpoints
async function resolveBreadcrumbNames() {
  try {
    if (parentDeptId.value) {
      // you already use this endpoint on index.vue
      const { data: depts } = await $axios.get('/api/productdepartment')
      const dept = (depts || []).find((d: any) => Number(d.id) === parentDeptId.value)
      if (dept) parentDeptRecord.value = dept
    }

    if (parentDeptId.value && parentSubId.value) {
      // gets subs for a department; then pick the one by id
      const { data: subs } = await $axios.get(`/api/categories/${parentDeptId.value}/subcategories`)
      const sub = (subs || []).find((s: any) => Number(s.id) === parentSubId.value)
      if (sub) parentSubRecord.value = sub
    }

    // Fallback: if your /api/subsubdepartments/{slug} already includes parent names,
    // use them when query is missing (optional).
    const d: any = subsubdepartment.value
    if (d) {
      if (!parentDeptRecord.value && d.Product_Department_Name) parentDeptRecord.value = d
      if (!parentSubRecord.value && d.Sub_Department_Name) parentSubRecord.value = d
    }
  } catch { /* ignore */ }
}



// run when we have either query ids or the subsubdepartment loaded
watch(
  [parentDeptId, parentSubId, () => subsubdepartment.value],
  resolveBreadcrumbNames,
  { immediate: true }
)

// breadcrumb navigation helpers (send query so index.vue restores state)
const goDept = () => router.push({
  path: localePath('/'),
  query: { deptId: parentDeptId.value ?? undefined }
})

const goSub = () => router.push({
  path: localePath('/'),
  query: { deptId: parentDeptId.value ?? undefined, subId: parentSubId.value ?? undefined }
})

// optional: go to the list that contains this sub-sub, and optionally highlight it
const goSubSubList = () => router.push({
  path: localePath('/'),
  query: {
    deptId: parentDeptId.value ?? undefined,
    subId: parentSubId.value ?? undefined,
    subSubId: slugId.value ?? undefined
  }
})








interface FilterValue {
  id: number
  value: string
}

type InputType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean'

type GridHeader = { id: number; name: string }
type GridRow = {
  id: number
  name: string
  price: number
  original_price?: number
  final_price?: number
  discount_amount?: number
  has_discount?: boolean
  active_discount?: any | null
  Product_Stock?: number
  Product_Code?: string | null
  Product_Sku?: string | null
  slug: string
  specs: Record<number, { value_id: number | null; label: string | null } | null>
  image: ProductImage | null
}


const headers = ref<GridHeader[]>([])
const rows = ref<GridRow[]>([])

const openCats = ref<Record<number, boolean>>({})          // default open
const isOpen = (id: number) => openCats.value[id] !== false
const toggleCat = (id: number) => (openCats.value[id] = !isOpen(id))
const filterOptionsId = (id: number) => `filter-options-${id}`
const filterHeadingId = (id: number) => `filter-heading-${id}`
const filterSelectedLabel = (id: number) => {
  const count = selectedFilters.value[id]?.length || 0
  return count ? t('listing.selectedCount', { count }) : ''
}

const clearCategory = (id: number) => {                    // clear one group
  selectedFilters.value[id] = []
}
const clearAllFilters = () => {                            // clear all groups
  for (const k of Object.keys(selectedFilters.value)) {
    selectedFilters.value[+k] = []
  }
  searchTerm.value = ''
  inStockOnly.value = false
  onSaleOnly.value = false
  sortOption.value = 'relevance'
  clearPriceFilter()
}




const goProduct = (slug: string, offerId?: number | null) => router.push({ path: localePath(`/product/${slug}`), query: offerId ? { vendor_offer_id: offerId } : {} })



interface FilterCategory {
  id: number
  name: string
  type: InputType
  values: FilterValue[]
}

interface SubSubDepartment {
  id: number
  Product_Sub_Sub_Department_Name: string
  Slug: string
  Product_Sub_Sub_Department_Description?: string
  Image_Path?: string
  View_Options?: boolean
  // Optional if your API sends them:
  Product_Department_Name?: string
  Sub_Department_Name?: string
}

interface SubSubDepartmentResponse {
  data: SubSubDepartment
  filters: any[] // we'll map to FilterCategory[]
}

interface ProductImage {
  Image_Path: string
}

interface Products {
  id: string
  Product_Name: string
  Product_Price: number
  Slug: string
  image: ProductImage | null
}

const filters = ref<FilterCategory[]>([])
const products = ref<Products[]>([])
const view_option = ref<boolean>(false)
// selected filters by description id -> array of value ids
const selectedFilters = ref<Record<number, number[]>>({})
const slugId = ref<number | null>(null);
const priceMin = ref(0)
const priceMax = ref(0)
const priceFilterActive = ref(false)
const syncingPrice = ref(false)
const priceBounds = ref({ min: 0, max: 0 })
const searchTerm = ref('')
const sortOption = ref('relevance')
const inStockOnly = ref(false)
const onSaleOnly = ref(false)
let productsTimer: ReturnType<typeof setTimeout> | null = null

const visibleRows = computed(() => filterAndSortProducts(rows.value, {
  query: searchTerm.value,
  sort: sortOption.value,
  inStockOnly: inStockOnly.value,
  onSaleOnly: onSaleOnly.value,
}))

const discoveryActiveCount = computed(() =>
  Number(Boolean(searchTerm.value.trim())) + Number(inStockOnly.value) + Number(onSaleOnly.value)
)

const siteUrl = computed(() => String(config.public.siteUrl || ''))
const baseCategoryPath = computed(() => `/departments/${slug.value}`)
const categoryPath = computed(() => localePath(baseCategoryPath.value))

useHead(() => {
  const title = categoryName(subsubdepartment.value) || t('common.products')
  const description = seoDescription(
    categoryText(subsubdepartment.value),
    locale.value === 'ar' ? `تسوّق منتجات ${title} من مركز المستلزمات الصناعية.` : `Shop ${title} products from ISC Depot.`,
  )
  const canonical = canonicalUrl(siteUrl.value, categoryPath.value)
  const image = assetUrl(
    String($r2Url || ''),
    subsubdepartment.value?.Image_Path,
  ) || assetUrl(siteUrl.value, '/logonew1.jpg')
  const breadcrumbs = [
    { name: t('common.home'), path: localePath('/') },
    { name: title, path: categoryPath.value },
  ]

  return {
    title: seoTitle(title),
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: seoTitle(title) },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'ISC Depot' },
      { property: 'og:locale', content: openGraphLocale(locale.value) },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seoTitle(title) },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    link: [
      { rel: 'canonical', href: canonical },
      ...localizedAlternateLinks(siteUrl.value, baseCategoryPath.value),
    ],
    script: title ? [
      {
        key: 'category-collection-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(collectionPageJsonLd({
          siteUrl: siteUrl.value,
          path: categoryPath.value,
          name: title,
          description,
          locale: locale.value,
          products: visibleRows.value,
          r2Url: String($r2Url || ''),
        })),
      },
      {
        key: 'category-breadcrumb-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbJsonLd(breadcrumbs, siteUrl.value)),
      },
    ] : [],
  }
})

const priceStep = computed(() => {
  const span = priceBounds.value.max - priceBounds.value.min
  return span > 0 && span <= 20 ? 0.1 : 1
})

const hasPriceBounds = computed(() => priceBounds.value.max > priceBounds.value.min)

const selectedPriceLabel = computed(() => {
  if (!hasPriceBounds.value) return t('listing.noPriceRange')
  return `${money(priceMin.value)} - ${money(priceMax.value)}`
})

const money = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount.toFixed(3) : '0.000'
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizePriceRange = () => {
  if (!hasPriceBounds.value) return
  const min = priceBounds.value.min
  const max = priceBounds.value.max
  priceMin.value = clamp(Number(priceMin.value || min), min, max)
  priceMax.value = clamp(Number(priceMax.value || max), min, max)
  if (priceMin.value > priceMax.value) {
    const midpoint = priceMin.value
    priceMin.value = priceMax.value
    priceMax.value = midpoint
  }
}

const syncPriceBounds = (range?: { min?: number | string | null; max?: number | string | null }) => {
  const nextMin = Number(range?.min ?? 0)
  const nextMax = Number(range?.max ?? 0)
  const min = Number.isFinite(nextMin) ? Math.floor(nextMin * 1000) / 1000 : 0
  const max = Number.isFinite(nextMax) ? Math.ceil(nextMax * 1000) / 1000 : 0

  syncingPrice.value = true
  priceBounds.value = { min, max }

  if (!priceFilterActive.value) {
    priceMin.value = min
    priceMax.value = max
  } else {
    normalizePriceRange()
  }

  const releaseSync = () => {
    syncingPrice.value = false
  }
  if (import.meta.client) requestAnimationFrame(releaseSync)
  else releaseSync()
}

const queueProductsFetch = () => {
  if (productsTimer) clearTimeout(productsTimer)
  productsTimer = setTimeout(() => {
    productsTimer = null
    getProducts()
  }, 250)
}

const markPriceActive = () => {
  priceFilterActive.value = true
  normalizePriceRange()
}

const clearPriceFilter = () => {
  syncingPrice.value = true
  priceFilterActive.value = false
  priceMin.value = priceBounds.value.min
  priceMax.value = priceBounds.value.max
  const releaseSync = () => {
    syncingPrice.value = false
    queueProductsFetch()
  }
  if (import.meta.client) requestAnimationFrame(releaseSync)
  else releaseSync()
}

const categoryPageError = (error: any) => {
  const status = Number(error?.response?.status || error?.statusCode || error?.status || 0)

  if (status === 404) {
    return createError({
      statusCode: 404,
      statusMessage: 'Category not found',
    })
  }

  return createError({
    statusCode: 503,
    statusMessage: 'Category information is temporarily unavailable',
  })
}

const getSlugId = async () => {
  try {
    const res = await $axios.get(`/api/subsubdepartments/slug/${slug.value}`)
    const payload = res.data
    const id = Number(payload?.data?.id ?? payload?.id ?? payload)
    slugId.value = Number.isFinite(id) ? id : null

  } catch (error) {
    console.error('Error fetching slug ID:', error)
    slugId.value = null
    return null
  }
}


const getDepartment = async () => {
  isloadingsubsubdepartments.value = true
  filtersError.value = ''
  try {
    const res = await $axios.get(`/api/subsubdepartments/${slug.value}`)

    // ✅ store the whole object for title/breadcrumb fallbacks
    subsubdepartment.value = res.data?.data ?? null

    // tolerate API casing: View_Options vs view_options
    view_option.value = res.data?.data?.View_Options;

    const apiFilters = res.data.filters as any[]

    filters.value = apiFilters.map((f) => ({
      id: Number(f.id),
      name: String(f.Product_Specification_Description_Name ?? ''),
      type: (f.input_type ?? 'select') as 'text' | 'number' | 'select' | 'multiselect' | 'boolean',
      values: (f.values ?? []).map((v: any) => ({
        id: Number(v.id),
        value: String(v.value),
      })),
    }))

    selectedFilters.value = filters.value.reduce((acc, f) => {
      acc[f.id] = [] as number[]
      return acc
    }, {} as Record<number, number[]>)
  } catch (error: any) {
    filtersError.value = t('listing.filtersError')
    throw categoryPageError(error)
  } finally {
    isloadingsubsubdepartments.value = false
  }
}


const getProducts = async (fatal = false) => {
  isloadingproducts.value = true
  productsError.value = ''
  try {
    const spec_ids = Object.values(selectedFilters.value).flat()

    const { data } = await $axios.get(`/api/products/${slug.value}`, {
      params: {
        filters: JSON.stringify(selectedFilters.value), // safe for GET
        spec_ids,
        ...(priceFilterActive.value ? {
          min_price: priceMin.value,
          max_price: priceMax.value,
        } : {}),
      },
    })

    headers.value = data.headers ?? []
    rows.value = data.products ?? []
    syncPriceBounds(data.price_range)
  } catch (error: any) {
    productsError.value = t('listing.productsError')
    if (fatal) {
      throw categoryPageError(error)
    }
  } finally {
    isloadingproducts.value = false
  }
}

// Refetch products whenever filters change
watch(selectedFilters, async () => {
  if (categoryRouteLoading) return
  queueProductsFetch()
}, { deep: true })

watch([priceMin, priceMax], () => {
  if (!import.meta.client) return
  if (syncingPrice.value) return
  markPriceActive()
  queueProductsFetch()
})

// Lock scroll when mobile drawer open
watch(showFilters, (val) => {
  if (import.meta.client) document.body.style.overflow = val ? 'hidden' : ''
})

let categoryRouteLoading = false

const resetCategoryPage = () => {
  if (productsTimer) {
    clearTimeout(productsTimer)
    productsTimer = null
  }

  subsubdepartment.value = null
  parentDeptRecord.value = null
  parentSubRecord.value = null
  filters.value = []
  selectedFilters.value = {}
  headers.value = []
  rows.value = []
  slugId.value = null
  priceBounds.value = { min: 0, max: 0 }
  priceMin.value = 0
  priceMax.value = 0
  priceFilterActive.value = false
}

const loadCategoryPage = async () => {
  categoryRouteLoading = true
  resetCategoryPage()

  try {
    await getDepartment()
    await Promise.all([
      getProducts(true),
      getSlugId(),
    ])
  } finally {
    categoryRouteLoading = false
  }
}

if (import.meta.server) {
  await loadCategoryPage()
}

onMounted(async () => {
  if (!subsubdepartment.value) {
    try {
      await loadCategoryPage()
    } catch (error) {
      showError(error as any)
    }
  }
})

watch(slug, async (nextSlug, previousSlug) => {
  if (!previousSlug || nextSlug === previousSlug) return

  try {
    await loadCategoryPage()
  } catch (error) {
    showError(error as any)
  }
})

onBeforeUnmount(() => {
  if (productsTimer) clearTimeout(productsTimer)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>





  <section class="bg-white py-6 px-4 max-w-screen-xl mx-auto">
    <div class="flex flex-col md:flex-row gap-6">

      <!-- Mobile Drawer Overlay -->
      <div v-if="showFilters" @click="showFilters = false" class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden">
      </div>


      <!-- Mobile Filter Toggle Button -->
      <div class="md:hidden px-4 mb-4">
        <button
          type="button"
          @click="showFilters = true"
          class="bg-gray-900 text-white px-4 py-2 rounded font-semibold shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          :aria-label="t('listing.openFilters')"
          :aria-expanded="showFilters ? 'true' : 'false'"
          aria-controls="mobile-product-filters"
        >
          ☰ {{ t('listing.filter') }}
        </button>
      </div>

      <!-- Mobile Filter Drawer -->
      <div
        id="mobile-product-filters"
        role="dialog"
        aria-modal="true"
        :aria-label="t('listing.filters')"
        class="fixed top-0 w-72 h-full bg-white shadow-lg z-50 transition-transform duration-300 transform md:hidden"
        :class="[
          isArabic ? 'right-0' : 'left-0',
          showFilters ? 'translate-x-0' : (isArabic ? 'translate-x-full' : '-translate-x-full')
        ]">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="font-bold text-lg">{{ t('listing.filters') }}</h3>
          <button
            type="button"
            @click="showFilters = false"
            :aria-label="t('listing.closeFilters')"
            class="text-gray-700 border border-gray-300 px-2 py-1 rounded hover:bg-gray-100">
            {{ t('common.close') }}
          </button>
        </div>

        <div class="p-4 space-y-6 overflow-y-auto" aria-live="polite">
          <div v-if="isloadingsubsubdepartments" role="status" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {{ t('listing.loadingFilters') }}
          </div>
          <div v-else-if="filtersError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ filtersError }}
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-slate-900">{{ t('listing.priceRange') }}</h3>
                <p class="mt-0.5 text-xs text-slate-500">{{ selectedPriceLabel }} {{ t('common.omr') }}</p>
              </div>
              <button
                v-if="priceFilterActive"
                type="button"
                class="text-xs font-semibold text-teal-700 hover:text-teal-900"
                :aria-label="t('listing.clearFilter', { name: t('listing.priceRange') })"
                @click="clearPriceFilter"
              >
                {{ t('common.reset') }}
              </button>
            </div>

            <div v-if="hasPriceBounds" class="mt-4">
              <div class="relative h-8">
                <input
                  v-model.number="priceMin"
                  type="range"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="priceStep"
                  class="price-range-input absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
                  :aria-label="t('listing.minimumPrice')"
                  @input="markPriceActive"
                />
                <input
                  v-model.number="priceMax"
                  type="range"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="priceStep"
                  class="price-range-input absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
                  :aria-label="t('listing.maximumPrice')"
                  @input="markPriceActive"
                />
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <label class="text-xs font-medium text-slate-600">
                  {{ t('listing.min') }}
                  <input
                    v-model.number="priceMin"
                    type="number"
                    :min="priceBounds.min"
                    :max="priceBounds.max"
                    :step="priceStep"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    @input="markPriceActive"
                  />
                </label>
                <label class="text-xs font-medium text-slate-600">
                  {{ t('listing.max') }}
                  <input
                    v-model.number="priceMax"
                    type="number"
                    :min="priceBounds.min"
                    :max="priceBounds.max"
                    :step="priceStep"
                    class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    @input="markPriceActive"
                  />
                </label>
              </div>
            </div>

            <p v-else class="mt-3 text-xs text-slate-500">{{ t('listing.priceUnavailable') }}</p>
          </div>

          <fieldset v-for="category in filters" :key="category.id" class="space-y-2">
            <legend class="font-semibold">{{ category.name }}</legend>
            <label v-for="opt in category.values" :key="opt.id" class="flex items-center gap-2">
              <input type="checkbox" class="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded" :value="opt.id"
                v-model="selectedFilters[category.id]" />
              <span>{{ opt.value }}</span>
            </label>
          </fieldset>
        </div>
      </div>

      <!-- Sidebar Filters -->
      <!-- Sidebar Filters -->
      <aside class="hidden md:block w-full md:w-1/4">
        <div class="sticky top-6">
          <div class="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg">
            <!-- Header -->
            <div class="px-5 py-4 flex items-center justify-between border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i class="fas fa-filter text-teal-600"></i>
                {{ t('listing.filters') }}
              </h2>
              <button type="button" @click="clearAllFilters"
                :aria-label="t('common.clearAll')"
                class="text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline">
                {{ t('common.clearAll') }}
              </button>
            </div>

            <!-- Body (scrolls if tall) -->
            <div class="max-h-[70vh] overflow-auto px-2 py-3">
              <div class="mx-2 mb-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-gray-800">{{ t('listing.priceRange') }}</h3>
                    <p class="mt-1 text-xs text-gray-500">{{ selectedPriceLabel }} {{ t('common.omr') }}</p>
                  </div>
	                  <button
	                    v-if="priceFilterActive"
	                    type="button"
	                    class="text-[11px] font-medium text-teal-700 hover:text-teal-900"
	                    :aria-label="t('listing.clearFilter', { name: t('listing.priceRange') })"
	                    @click="clearPriceFilter"
	                  >
                    {{ t('common.reset') }}
                  </button>
                </div>

                <div v-if="hasPriceBounds" class="mt-4">
                  <div class="relative h-8">
                    <input
                      v-model.number="priceMin"
                      type="range"
                      :min="priceBounds.min"
                      :max="priceBounds.max"
                      :step="priceStep"
                      class="price-range-input absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
                      :aria-label="t('listing.minimumPrice')"
                      @input="markPriceActive"
                    />
                    <input
                      v-model.number="priceMax"
                      type="range"
                      :min="priceBounds.min"
                      :max="priceBounds.max"
                      :step="priceStep"
                      class="price-range-input absolute inset-x-0 top-1/2 w-full -translate-y-1/2"
                      :aria-label="t('listing.maximumPrice')"
                      @input="markPriceActive"
                    />
                  </div>

                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <label class="text-[11px] font-medium text-gray-600">
                      {{ t('listing.min') }}
                      <input
                        v-model.number="priceMin"
                        type="number"
                        :min="priceBounds.min"
                        :max="priceBounds.max"
                        :step="priceStep"
                        class="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        @input="markPriceActive"
                      />
                    </label>
                    <label class="text-[11px] font-medium text-gray-600">
                      {{ t('listing.max') }}
                      <input
                        v-model.number="priceMax"
                        type="number"
                        :min="priceBounds.min"
                        :max="priceBounds.max"
                        :step="priceStep"
                        class="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        @input="markPriceActive"
                      />
                    </label>
                  </div>
                </div>

                <p v-else class="mt-3 text-xs text-gray-500">{{ t('listing.priceUnavailable') }}</p>
              </div>

              <ul class="space-y-3">
                <!-- Category -->
                <li v-for="category in filters" :key="category.id" class="rounded-lg border border-gray-200 bg-gray-50">
                  <!-- Category header / accordion toggle -->
                  <div class="flex items-center justify-between gap-2 px-4 py-3">
                  <button
                    type="button"
                    :id="filterHeadingId(category.id)"
                    v-bind="activeDescendantState(isOpen(category.id), filterOptionsId(category.id))"
                    @click="toggleCat(category.id)"
                    class="flex flex-1 items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                    <div class="flex items-center gap-2 text-gray-800">
                      <span class="text-sm font-semibold">{{ category.name }}</span>
                      <span v-if="(selectedFilters[category.id] ?? []).length"
                        class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
                        {{ filterSelectedLabel(category.id) }}
                      </span>
                    </div>

	                    <svg aria-hidden="true" class="h-4 w-4 text-gray-500 transition-transform"
	                        :class="isOpen(category.id) ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clip-rule="evenodd" />
                      </svg>
                  </button>
                  <button
                    type="button"
                    @click="clearCategory(category.id)"
                    class="rounded px-2 py-1 text-[11px] text-slate-600 hover:bg-white hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    :aria-label="t('listing.clearFilter', { name: category.name })"
                  >
                    {{ t('common.reset') }}
                  </button>
                  </div>

                  <!-- Options -->
                  <transition name="fade">
                    <div
                      v-show="isOpen(category.id)"
                      :id="filterOptionsId(category.id)"
                      role="group"
                      :aria-labelledby="filterHeadingId(category.id)"
                      class="px-4 pb-3">
                      <div class="max-h-48 overflow-auto pr-1 space-y-1.5">
                        <label v-for="opt in category.values" :key="opt.id" :title="opt.value"
                          class="flex items-center gap-2 text-[13px] text-gray-700 hover:text-teal-700">
                          <input type="checkbox"
                            class="h-4 w-4 rounded-sm border-gray-300 accent-teal-600 focus:ring-2 focus:ring-teal-400"
                            :value="opt.id" v-model="selectedFilters[category.id]" />
                          <span class="truncate">{{ opt.value }}</span>
                        </label>
                      </div>
                    </div>
                  </transition>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>




      <!-- Main Content -->
      <main class="w-full md:w-3/4 space-y-6">
        <!-- Title -->
        <div>
          <h1 class="text-2xl font-bold mb-2">
            {{ categoryName(subsubdepartment) }}
          </h1>
          <p class="text-sm text-gray-700">
            {{ categoryText(subsubdepartment) }}


          </p>
        </div>


        <nav aria-label="Breadcrumb" class="mb-4">
          <ol class="flex items-center gap-2 text-sm text-slate-600">
            <li>
              <NuxtLink to="/" class="hover:text-emerald-700">{{ t('common.home') }}</NuxtLink>
            </li>
            <li class="text-slate-400">›</li>

            <li v-if="parentDeptId">
              <button @click="goDept" class="hover:text-emerald-700">
                {{ parentDeptName || t('common.department') }}
              </button>
            </li>
            <li v-if="parentDeptId" class="text-slate-400">›</li>

            <li v-if="parentSubId">
              <button @click="goSub" class="hover:text-emerald-700">
                {{ parentSubName || t('common.category') }}
              </button>
            </li>
            <li v-if="parentSubId" class="text-slate-400">›</li>

            <!-- Current sub-sub: label only (or make it a button to go to list) -->
            <li class="text-slate-900 font-semibold">
              <button @click="goSubSubList" class="hover:text-emerald-700">
                {{ categoryName(subsubdepartment) || t('common.products') }}
              </button>
              <!-- If you prefer non-clickable current crumb, replace the <button> with a <span>. -->
            </li>
          </ol>
        </nav>


        <!-- Product Types -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">

          <div class="border rounded p-4 flex flex-col items-center text-center">


            <img :src="`${$r2Url}/` + subsubdepartment?.Image_Path" alt="Insulated" class="h-16 mb-2">

          </div>

        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_180px_auto_auto] gap-3 lg:items-end">
            <label class="block">
              <span class="text-xs font-medium text-slate-600">{{ t('listing.searchWithin') }}</span>
              <input
                v-model.trim="searchTerm"
                type="search"
                class="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                :placeholder="t('listing.searchWithinPlaceholder')"
              />
            </label>

            <label class="block">
              <span class="text-xs font-medium text-slate-600">{{ t('listing.sortBy') }}</span>
              <select
                v-model="sortOption"
                class="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="relevance">{{ t('listing.sort.relevance') }}</option>
                <option value="price_asc">{{ t('listing.sort.priceAsc') }}</option>
                <option value="price_desc">{{ t('listing.sort.priceDesc') }}</option>
                <option value="rating_desc">{{ t('listing.sort.ratingDesc') }}</option>
                <option value="newest">{{ t('listing.sort.newest') }}</option>
              </select>
            </label>

            <label class="flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
              <input v-model="inStockOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-teal-600" />
              {{ t('listing.inStockOnly') }}
            </label>

            <label class="flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm text-slate-700">
              <input v-model="onSaleOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-teal-600" />
              {{ t('listing.onSaleOnly') }}
            </label>
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{{ t('listing.showingProducts', { shown: visibleRows.length, total: rows.length }) }}</span>
            <span v-if="discoveryActiveCount">{{ t('listing.discoveryActive', { count: discoveryActiveCount }) }}</span>
          </div>
        </div>


        <!-- Table -->
        <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm" aria-live="polite">

          <div v-if="isloadingproducts" role="status" class="px-5 py-10 text-center text-slate-600">
            {{ t('listing.loadingProducts') }}
          </div>
          <div v-else-if="productsError" role="alert" class="px-5 py-10 text-center text-red-700 bg-red-50">
            {{ productsError }}
          </div>

          <div v-else-if="subsubdepartment?.View_Options === true && visibleRows.length"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <article v-for="row in visibleRows" :key="row.listing_key || row.id" @click="goProduct(row.slug, row.vendor_offer_id)" @keydown.enter="goProduct(row.slug, row.vendor_offer_id)" @keydown.space.prevent="goProduct(row.slug, row.vendor_offer_id)"
              role="link" tabindex="0" :aria-label="t('listing.viewProduct', { name: productName(row) })"
              class="group relative rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-lg hover:-translate-y-[2px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50">
              <!-- top image -->
              <div class="aspect-[4/3] overflow-hidden bg-slate-50">
                <img :src="row.image?.Image_Path" :alt="productName(row)"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy" />


              </div>

              <!-- content -->
              <div class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-[15px] font-semibold text-slate-900 line-clamp-2">
                    {{ productName(row) }}
                    <span class="block text-xs font-normal text-slate-500">{{ row.seller_name || 'ISC' }}</span>
                  </h3>
                  <div class="text-right shrink-0">
                    <div
                      class="text-[13px] font-semibold px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm">
                      {{ Number(row.final_price ?? row.price ?? 0).toFixed(3) }} {{ t('common.omr') }}
                    </div>
                    <div v-if="row.has_discount" class="mt-1 text-[11px] text-slate-400 line-through">
                      {{ Number(row.original_price ?? row.price ?? 0).toFixed(3) }} {{ t('common.omr') }}
                    </div>
                  </div>
                </div>

                <div v-if="row.has_discount" class="mt-3 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {{ t('listing.saveAmount', { amount: Number(row.discount_amount || 0).toFixed(3) }) }}
                </div>

                <div class="mt-3 flex items-center gap-2 text-xs text-slate-600" :aria-label="formatRatingSummary(row.review_summary).label">
                  <span class="flex text-amber-500" aria-hidden="true">
                    <span
                      v-for="(state, starIndex) in starStates(row.review_summary?.average_rating)"
                      :key="`${row.listing_key || row.id}-star-${starIndex}`"
                      :class="state === 'empty' ? 'text-slate-300' : 'text-amber-500'"
                    >★</span>
                  </span>
                  <span>{{ formatRatingSummary(row.review_summary).average }}</span>
                  <span>({{ formatRatingSummary(row.review_summary).count }})</span>
                </div>

                <!-- spec chips -->
                <div class="mt-3 flex flex-wrap gap-2">

                </div>
              </div>

              <!-- bottom bar -->
              <div class="px-4 pb-4">
                <div class="flex items-center justify-between text-[12px] text-slate-500">
                  <span class="inline-flex items-center gap-1">
                    <span class="i-heroicons-arrow-top-right-on-square-20-solid"></span>
                    {{ t('listing.viewDetails') }}
                  </span>
	                  <svg aria-hidden="true" class="h-4 w-4 text-slate-400 group-hover:text-cyan-500 transition-colors" viewBox="0 0 20 20"
	                    fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1
                  1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>

              <!-- subtle gradient border on top -->
              <div
                class="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-500/80 via-sky-500/80 to-blue-600/80">
              </div>
            </article>
          </div>

          <div v-else-if="subsubdepartment?.View_Options === true" class="px-5 py-10 text-center text-slate-500">
            {{ t('listing.noProducts') }}
          </div>

          <div class="overflow-auto rounded-xl border border-slate-200 shadow-sm" v-else>
            <table class="min-w-full table-fixed text-sm bg-white" :aria-label="t('common.products')">
              <!-- Control widths: Name grows; specs get a min width; Price fixed -->
              <colgroup>
                <col class="w-[32%]" />
                <!-- one col per dynamic header -->
                <col v-for="h in headers" :key="`col-${h.id}`" class="min-w-[140px]" />
                <col class="w-[120px]" />
              </colgroup>

              <thead class="sticky top-0 z-10">
                <tr
                  class="bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-xs uppercase tracking-wide shadow-sm">
	                  <th scope="col" class="px-5 py-3 text-left font-semibold">{{ t('listing.name') }}</th>
	                  <th scope="col" v-for="h in headers" :key="h.id" class="px-5 py-3 text-left font-semibold">
	                    {{ h.name }}
	                  </th>
	                  <th scope="col" class="px-5 py-3 text-right font-semibold">{{ t('listing.price') }}</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100 text-[13px]">
	                <tr v-for="row in visibleRows" :key="row.listing_key || row.id" @click="goProduct(row.slug, row.vendor_offer_id)" @keydown.enter="goProduct(row.slug, row.vendor_offer_id)" @keydown.space.prevent="goProduct(row.slug, row.vendor_offer_id)"
	                  role="row" tabindex="0" :aria-label="t('listing.viewProduct', { name: productName(row) })"
	                  class="group cursor-pointer odd:bg-white even:bg-slate-50 hover:bg-cyan-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40">
                  <!-- Name -->
	                  <td class="px-5 py-3 font-medium text-slate-900 whitespace-nowrap truncate" :title="productName(row)">
	                    <div>{{ productName(row) }}</div><div class="text-xs text-slate-500">{{ row.seller_name || 'ISC' }}</div>
	                    <div class="mt-1 flex items-center gap-1 text-xs text-slate-500" :aria-label="formatRatingSummary(row.review_summary).label">
	                      <span class="text-amber-500" aria-hidden="true">★</span>
	                      <span>{{ formatRatingSummary(row.review_summary).average }}</span>
	                      <span>({{ formatRatingSummary(row.review_summary).count }})</span>
	                    </div>
	                  </td>

                  <!-- Dynamic specs -->
                  <td v-for="h in headers" :key="`${row.listing_key || row.id}:${h.id}`"
                    class="px-5 py-3 text-slate-700 whitespace-nowrap truncate" :title="row.specs[h.id]?.label ?? '—'">
                    {{ row.specs[h.id]?.label ?? '—' }}
                  </td>

                  <!-- Price -->
                  <td class="px-5 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    <div>{{ Number(row.final_price ?? row.price ?? 0).toFixed(3) }} <span class="text-slate-500 font-normal">{{ t('common.omr') }}</span></div>
                    <div v-if="row.has_discount" class="text-xs font-normal text-slate-400 line-through">
                      {{ Number(row.original_price ?? row.price ?? 0).toFixed(3) }} {{ t('common.omr') }}
                    </div>
                  </td>
                </tr>

                <!-- Optional: empty state row -->
                <tr v-if="visibleRows.length === 0">
	                  <td :colspan="headers.length + 2" role="status" class="px-5 py-6 text-center text-slate-500">
                    {{ t('listing.noProducts') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>



        </div>


      </main>
    </div>
  </section>





</template>

<style scoped>
.price-range-input {
  pointer-events: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: rgb(203 213 225);
}

.price-range-input::-webkit-slider-thumb {
  pointer-events: auto;
  appearance: none;
  width: 18px;
  height: 18px;
  border: 3px solid white;
  border-radius: 999px;
  background: rgb(13 148 136);
  box-shadow: 0 2px 8px rgb(15 23 42 / 0.25);
}

.price-range-input::-moz-range-thumb {
  pointer-events: auto;
  width: 18px;
  height: 18px;
  border: 3px solid white;
  border-radius: 999px;
  background: rgb(13 148 136);
  box-shadow: 0 2px 8px rgb(15 23 42 / 0.25);
}
</style>
