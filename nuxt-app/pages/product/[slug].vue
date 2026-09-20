<script setup lang="ts">
definePageMeta({
    layout: 'layouts',
    alias: ['/ar/product/:slug'],
  })
import { ref, onMounted, computed, reactive, watch } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'
import { useCartStore } from '~/stores/cart'
import * as Toastification from 'vue-toastification'
import { formatRatingSummary, starStates } from '~/utils/productEngagement.js'
import { filterAndSortProducts, readRecentlyViewed, updateRecentlyViewed, writeRecentlyViewed } from '~/utils/discovery.js'
import { assetUrl, breadcrumbJsonLd, canonicalUrl, localizedAlternateLinks, openGraphLocale, productJsonLd, seoDescription, seoTitle } from '~/utils/storefrontSeo.js'
import { formatBulkTierRange, normalizeBulkTiers, resolveBulkTier } from '~/utils/bulkPricing.js'

import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import { useRouter } from 'vue-router'

const router = useRouter()


const { $axios, $r2Url } = useNuxtApp()
const config = useRuntimeConfig()
const route = useRoute()

const slug = computed(() => String(route.params.slug || ''))

const cart = useCartStore()
const toast = import.meta.client && typeof Toastification.useToast === 'function'
  ? Toastification.useToast()
  : {
      success: () => undefined,
      error: () => undefined,
    }
const { isAuthenticated } = useAuth()
const { t, field, locale, localePath, productName, productText, categoryName } = useStorefrontLocale()
const quantity = ref<number>(1);

const visible = ref<boolean>(false);
const index = ref<number>(0);
const is_active = ref<any>([]);
const features = ref<any>([]);


const swiperRef = ref<any>(null)
const activeIndex = ref(0)

// --- Favorites (UI + API) ---
const isFavorited = ref(false)
const favBusy = ref(false)
const backInStockBusy = ref(false)
const backInStockMessage = ref('')


const onSwiper = (sw: any) => (swiperRef.value = sw)
const onSlideChange = (sw: any) => (activeIndex.value = sw.activeIndex)

const goToSlide = (i: number) => swiperRef.value?.slideTo(i)
const prevSlide  = () => swiperRef.value?.slidePrev()
const nextSlide  = () => swiperRef.value?.slideNext()


function openLightbox(i: number) {
  index.value = i
  visible.value = true
}

 interface ProductImage {
  Image_Path: string;
}

interface RelDepartment {
  id: number
  Product_Department_Name: string
}
interface RelSubDepartment {
  id: number
  Sub_Department_Name: string
}
interface RelSubSubDepartment {
  id: number
  Product_Sub_Sub_Department_Name: string
  Slug: string
}

interface Product {
  Vendor_Offer_Id?: number | null;
  Seller_Name?: string;
  id: number;
  Product_Name: string;
  Product_Name_Ar?: string;
  Slug: string;
  Product_Price: number;
  Original_Price?: number;
  Product_Final_Price?: number;
  Discount_Amount?: number;
  Has_Discount?: boolean;
  Active_Discount?: any | null;
  Bulk_Prices?: any[];
  bulk_prices?: any[];
  Inhouse_Barcode_Source: string;
  Product_Description: string;
  Product_Stock: number;
  images: ProductImage[]; // updated to support multiple images
  Weight_Kg: number;
  Length_Cm: number;
  Width_Cm: number;
  Height_Cm: number;

   // ✅ relations loaded by: product->load(['images','department','subdepartment','subSubDepartment'])
  department?: RelDepartment | null
  subdepartment?: RelSubDepartment | null
  sub_sub_department?: RelSubSubDepartment | null

}

interface SpecificationGroup {
  category: string;
  values: string[];
}

interface ProductDetailsResponse {
  product: Product;
  specifications: SpecificationGroup[];
  review_summary?: ReviewSummary;
}

interface ReviewSummary {
  average_rating: string;
  review_count: number;
  distribution?: Record<number, number>;
}

interface ProductReview {
  id: number;
  Rating: number;
  Title?: string | null;
  Body: string;
  Verified_Purchase?: boolean;
  Helpful_Count?: number;
  Report_Count?: number;
  created_at?: string;
  customer?: { Customer_Full_Name?: string | null } | null;
  replies?: Array<{ id: number; Reply_Type: string; Body: string; created_at?: string }>;
}

interface ProductQuestion {
  id: number;
  Question: string;
  Helpful_Count?: number;
  Report_Count?: number;
  created_at?: string;
  customer?: { Customer_Full_Name?: string | null } | null;
  answers?: Array<{ id: number; Answer_Type: string; Body: string; created_at?: string }>;
}


// --- Safe accessors for names/ids/slugs ---
const dept    = computed(() => product.value?.department ?? null)
const sub     = computed(() => product.value?.subdepartment ?? null)
const subSub  = computed(() => product.value?.sub_sub_department ?? null)

const deptName   = computed(() => categoryName(dept.value))
const subName    = computed(() => categoryName(sub.value))
const subSubName = computed(() => categoryName(subSub.value))
const productOriginalPrice = computed(() => Number(product.value?.Original_Price ?? product.value?.Product_Price ?? 0))
const productFinalPrice = computed(() => Number(product.value?.Product_Final_Price ?? product.value?.Product_Price ?? 0))
const productUnitDiscount = computed(() => Number(product.value?.Discount_Amount ?? Math.max(productOriginalPrice.value - productFinalPrice.value, 0)))
const productHasDiscount = computed(() => Boolean(product.value?.Has_Discount ?? productUnitDiscount.value > 0))
const isOutOfStock = computed(() => Number(product.value?.Product_Stock ?? 0) <= 0)

// --- Quantity-tier bulk pricing (tier wins over product discounts, no stacking) ---
// laravel-api's detail endpoint exposes the tiers as 'Bulk_Prices' (house casing);
// bulk_prices/bulkPrices kept as fallbacks for other serializations.
const bulkTiers = computed(() => normalizeBulkTiers((product.value as any)?.Bulk_Prices ?? (product.value as any)?.bulk_prices ?? (product.value as any)?.bulkPrices ?? []))
const activeBulkTier = computed(() => resolveBulkTier(bulkTiers.value, quantity.value || 1))
const effectiveUnitPrice = computed(() =>
  activeBulkTier.value ? Number(activeBulkTier.value.unit_price) : productFinalPrice.value
)

// --- Breadcrumb navigation helpers ---
const goDept = () => {
  if (!dept.value?.id) return
  router.push({
    path: localePath('/'),
    query: { deptId: dept.value.id }
  })
}

const goSub = () => {
  if (!dept.value?.id || !sub.value?.id) return
  router.push({
    path: localePath('/'),
    query: { deptId: dept.value.id, subId: sub.value.id }
  })
}

const goSubSub = () => {
  if (!subSub.value?.Slug) return
  // Goes to /departments/<slug> as requested. We also pass ids to keep context.
  router.push({
    path: localePath(`/departments/${subSub.value.Slug}`),
    query: {
      deptId: dept.value?.id ?? undefined,
      subId:  sub.value?.id ?? undefined,
      subSubId: subSub.value?.id ?? undefined
    }
  })
}


const sellerOffers = ref<Array<{ vendor_offer_id: number | null; seller_name: string; price: number; stock: number }>>([])
const product = ref<Product | null>(null)
const specifications = ref<SpecificationGroup[]>([])
const reviewSummary = ref<ReviewSummary>({ average_rating: '0.00', review_count: 0, distribution: {} })
const reviews = ref<ProductReview[]>([])
const questions = ref<ProductQuestion[]>([])
const engagementLoading = ref(false)
const reviewBusy = ref(false)
const questionBusy = ref(false)
const reviewMessage = ref('')
const questionMessage = ref('')
const reviewForm = reactive({ rating: 5, title: '', body: '' })
const questionForm = reactive({ question: '' })
const ratingDisplay = computed(() => formatRatingSummary(reviewSummary.value))
const ratingStars = computed(() => starStates(reviewSummary.value.average_rating))
const relatedProducts = ref<any[]>([])
const recentlyViewedProducts = ref<any[]>([])
const siteUrl = computed(() => String(config.public.siteUrl || ''))
const baseProductPath = computed(() => `/product/${product.value?.Slug || slug.value}`)
const productPath = computed(() => localePath(baseProductPath.value))
const seoBreadcrumbs = computed(() => [
  { name: t('common.home'), path: localePath('/') },
  ...(subSubName.value && subSub.value?.Slug ? [{ name: subSubName.value, path: localePath(`/departments/${subSub.value.Slug}`) }] : []),
  ...(productName(product.value) ? [{ name: productName(product.value), path: productPath.value }] : []),
])

useHead(() => {
  const name = productName(product.value) || t('common.products')
  const description = seoDescription(
    productText(product.value),
    locale.value === 'ar' ? `${name} من مركز المستلزمات الصناعية.` : `${name} from ISC Depot.`,
  )
  const canonical = canonicalUrl(siteUrl.value, productPath.value)
  const image = assetUrl(
    String($r2Url || ''),
    product.value?.images?.[0]?.Image_Path,
  ) || assetUrl(siteUrl.value, '/logonew1.jpg')
  const structuredProduct = product.value
    ? productJsonLd({
        product: {
          ...product.value,
          Product_Name: name,
          Product_Description: productText(product.value),
        },
        reviewSummary: reviewSummary.value,
        siteUrl: siteUrl.value,
        r2Url: String($r2Url || ''),
      })
    : null

  if (structuredProduct) {
    structuredProduct.url = canonical
    structuredProduct.offers.url = canonical
  }

  const scripts = product.value ? [
    {
      key: 'product-jsonld',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredProduct),
    },
    {
      key: 'product-breadcrumb-jsonld',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(breadcrumbJsonLd(seoBreadcrumbs.value, siteUrl.value)),
    },
  ] : []

  return {
    title: seoTitle(name),
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: seoTitle(name) },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'product' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'ISC Depot' },
      { property: 'og:locale', content: openGraphLocale(locale.value) },
      { property: 'og:image', content: image },
      { property: 'product:price:amount', content: productFinalPrice.value.toFixed(3) },
      { property: 'product:price:currency', content: 'OMR' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: seoTitle(name) },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    link: [
      { rel: 'canonical', href: canonical },
      ...localizedAlternateLinks(siteUrl.value, baseProductPath.value),
    ],
    script: scripts,
  }
})


const getProductFeatures = async (): Promise<void> => {
    
    try{
        const response = await $axios.get(`/api/products/value/${slug.value}`);
         console.log('Product features response:', response.data.is_ative);
      
        is_active.value = response.data.is_ative;
        features.value = response.data.features;
        

    }catch(error){
        console.error('Error fetching product features:', error);
    }finally{

    }
  


}


const normalizedIsActive = computed(() =>
  (is_active.value ?? [])
    .filter(Boolean)
    .map((x: any) => ({
      label: x?.description?.Product_Specification_Description_Name ?? '',
      value: field(x?.spec_value, 'value'),
    }))
)


const setLocalFav = (on: boolean) => {
  if (!product.value) return
  localStorage.setItem(`fav:${product.value.id}`, on ? '1' : '0')
}

const loadLocalFav = () => {
  if (!product.value) return
  isFavorited.value = localStorage.getItem(`fav:${product.value.id}`) === '1'
}

// call after product loads
watch(product, (p) => {
  if (p && import.meta.client) loadLocalFav()
})

const toggleFavorite = async () => {
  if (!product.value || favBusy.value) return
  favBusy.value = true

  // optimistic toggle
  const prev = isFavorited.value
  isFavorited.value = !prev
  setLocalFav(isFavorited.value)

  try {
    const { data } = await $axios.post(
      `/api/favorites/${product.value.Slug}/toggle`,
      {},
      { withCredentials: true }
    )
    // trust server truth if present
    if (typeof data?.favorited === 'boolean') {
      isFavorited.value = data.favorited
      setLocalFav(isFavorited.value)
    }
    toast.success(isFavorited.value ? t('product.addedToFavorites') : t('product.removedFromFavorites'))
  } catch (e: any) {
    // revert on error
    isFavorited.value = prev
    setLocalFav(prev)
    toast.error(e?.response?.status === 401 ? t('product.loginForFavorites') : t('product.favoriteError'))
  } finally {
    favBusy.value = false
  }
}



const incrementQty = () => {
  quantity.value++
}

const decrementQty = () => {
  if (quantity.value > 1) quantity.value--
}


const addToCart = async () => {
  if (!product.value || offerLoading.value) return;

  const stock = Number(product.value.Product_Stock ?? 0)
  if (stock <= 0) {
    toast.error(t('product.outOfStockError'))
    return
  }

  try {
    await cart.addToCart(
      {
        id: product.value.id,
        vendorOfferId: product.value.Vendor_Offer_Id ?? null,
        sellerName: product.value.Seller_Name ?? "ISC",
        slug: product.value.Slug,
        name: productName(product.value),
        name_ar: product.value.Product_Name_Ar,
        Product_Name: product.value.Product_Name,
        Product_Name_Ar: product.value.Product_Name_Ar,
        description: productText(product.value),
        price: productFinalPrice.value,
        originalPrice: productOriginalPrice.value,
        finalPrice: productFinalPrice.value,
        discountAmount: productUnitDiscount.value,
        hasDiscount: productHasDiscount.value,
        activeDiscount: product.value.Active_Discount ?? null,
        bulkPrices: bulkTiers.value, // cached so the guest cart can resolve tier prices client-side
        image: product.value.images?.[0]?.Image_Path || '',
        weight: product.value.Weight_Kg,
        length: product.value.Length_Cm,
        width: product.value.Width_Cm,
        height: product.value.Height_Cm,
        Product_Stock: product.value.Product_Stock, // Pass the stock
      },
      quantity.value
    );

    toast.success(t('product.addedToCart', { name: productName(product.value) }));
  } catch (e: any) {
    toast.error(e?.response?.status === 401 ? t('product.loginToAddCart') : t('product.cartError'));
  }
};

const requestBackInStockAlert = async () => {
  if (!product.value || backInStockBusy.value) return

  if (!isAuthenticated.value) {
    toast.error(t('product.loginForStockAlert'))
    return
  }

  backInStockBusy.value = true
  backInStockMessage.value = ''

  try {
    const { data } = await $axios.post(`/api/products/${product.value.id}/back-in-stock-alert`, {}, { withCredentials: true })
    backInStockMessage.value = data?.message || t('product.stockAlertSaved')
    toast.success(backInStockMessage.value)
  } catch (error: any) {
    backInStockMessage.value = error?.response?.data?.message || t('product.stockAlertError')
    toast.error(backInStockMessage.value)
  } finally {
    backInStockBusy.value = false
  }
}

const productCardImage = (item: any) => item?.image?.Image_Path || item?.image || item?.images?.[0]?.Image_Path || ''
const productCardPrice = (item: any) => Number(item?.final_price ?? item?.price ?? item?.Product_Final_Price ?? item?.Product_Price ?? 0)
const productCardSlug = (item: any) => item?.slug || item?.Slug

const openProductCard = (item: any) => {
  const nextSlug = productCardSlug(item)
  if (!nextSlug) return
  router.push({ path: localePath(`/product/${nextSlug}`), query: item.vendor_offer_id ? { vendor_offer_id: item.vendor_offer_id } : {} })
}

const loadRecentlyViewedProducts = () => {
  if (!import.meta.client || !product.value) return

  recentlyViewedProducts.value = readRecentlyViewed(window.localStorage)
    .filter((item: any) => productCardSlug(item) !== product.value?.Slug)
    .slice(0, 4)
}

const rememberRecentlyViewedProduct = () => {
  if (!import.meta.client || !product.value) return

  const current = {
    id: product.value.id,
    slug: product.value.Slug,
    vendor_offer_id: product.value.Vendor_Offer_Id ?? null,
    name: product.value.Product_Name,
    name_ar: product.value.Product_Name_Ar,
    image: product.value.images?.[0]?.Image_Path,
    price: productFinalPrice.value,
  }
  const next = updateRecentlyViewed(readRecentlyViewed(window.localStorage), current, 8)
  writeRecentlyViewed(window.localStorage, next)
  loadRecentlyViewedProducts()
}

const fetchRelatedProducts = async () => {
  if (!subSub.value?.Slug || !product.value) {
    relatedProducts.value = []
    return
  }

  try {
    const { data } = await $axios.get(`/api/products/${subSub.value.Slug}`)
    relatedProducts.value = filterAndSortProducts(data?.products || [], { sort: 'rating_desc' })
      .filter((item: any) => Number(item.id) !== Number(product.value?.id))
      .slice(0, 4)
  } catch (error) {
    relatedProducts.value = []
  }
}



const offerLoading = ref(false)
let productRequest = 0
const getProducts = async (): Promise<void> => {
  const requestId = ++productRequest
  offerLoading.value = true
  try {
    const response = await $axios.get(`/api/products/details/${slug.value}`, { params: { vendor_offer_id: route.query.vendor_offer_id || undefined } })
 
    if (requestId !== productRequest) return
    product.value = {
      ...response.data.product,
      price: parseFloat(response.data.product.price),
    }
    sellerOffers.value = response.data.offers || []
    specifications.value = response.data.specifications
    reviewSummary.value = response.data.review_summary || reviewSummary.value
    await fetchRelatedProducts()
 
  } catch (error: any) {
    if (requestId !== productRequest) return
    product.value = null
    const status = Number(error?.response?.status || error?.statusCode || error?.status || 0)
    if (status === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product not found',
      })
    }

    throw createError({
      statusCode: 503,
      statusMessage: 'Product information is temporarily unavailable',
    })
  } finally {
    if (requestId === productRequest) offerLoading.value = false
  }
}

const fetchProductEngagement = async () => {
  engagementLoading.value = true
  try {
    const [reviewResponse, questionResponse] = await Promise.all([
      $axios.get(`/api/products/details/${slug.value}/reviews`),
      $axios.get(`/api/products/details/${slug.value}/questions`),
    ])

    reviewSummary.value = reviewResponse.data?.summary || reviewSummary.value
    reviews.value = reviewResponse.data?.data || []
    questions.value = questionResponse.data?.data || []
  } catch (error) {
    console.error('Error fetching product engagement:', error)
  } finally {
    engagementLoading.value = false
  }
}

const submitReview = async () => {
  if (!isAuthenticated.value) {
    toast.error(t('product.loginForReviews'))
    return
  }

  reviewBusy.value = true
  reviewMessage.value = ''
  try {
    const { data } = await $axios.post(`/api/products/details/${slug.value}/reviews`, {
      rating: reviewForm.rating,
      title: reviewForm.title,
      body: reviewForm.body,
    }, { withCredentials: true })

    reviewForm.rating = 5
    reviewForm.title = ''
    reviewForm.body = ''
    reviewMessage.value = data?.message || t('product.reviewSubmitted')
    toast.success(reviewMessage.value)
    await fetchProductEngagement()
  } catch (error: any) {
    reviewMessage.value = error?.response?.data?.message || t('product.reviewError')
    toast.error(reviewMessage.value)
  } finally {
    reviewBusy.value = false
  }
}

const submitQuestion = async () => {
  if (!isAuthenticated.value) {
    toast.error(t('product.loginForReviews'))
    return
  }

  questionBusy.value = true
  questionMessage.value = ''
  try {
    const { data } = await $axios.post(`/api/products/details/${slug.value}/questions`, {
      question: questionForm.question,
    }, { withCredentials: true })

    questionForm.question = ''
    questionMessage.value = data?.message || t('product.questionSubmitted')
    toast.success(questionMessage.value)
    await fetchProductEngagement()
  } catch (error: any) {
    questionMessage.value = error?.response?.data?.message || t('product.questionError')
    toast.error(questionMessage.value)
  } finally {
    questionBusy.value = false
  }
}

const markReviewHelpful = async (review: ProductReview) => {
  if (!isAuthenticated.value) return toast.error(t('product.loginForReviews'))
  await $axios.post(`/api/reviews/${review.id}/helpful`, {}, { withCredentials: true })
  review.Helpful_Count = Number(review.Helpful_Count || 0) + 1
}

const reportReview = async (review: ProductReview) => {
  if (!isAuthenticated.value) return toast.error(t('product.loginForReviews'))
  await $axios.post(`/api/reviews/${review.id}/report`, {}, { withCredentials: true })
  reviews.value = reviews.value.filter(item => item.id !== review.id)
}

const markQuestionHelpful = async (question: ProductQuestion) => {
  if (!isAuthenticated.value) return toast.error(t('product.loginForReviews'))
  await $axios.post(`/api/questions/${question.id}/helpful`, {}, { withCredentials: true })
  question.Helpful_Count = Number(question.Helpful_Count || 0) + 1
}

const reportQuestion = async (question: ProductQuestion) => {
  if (!isAuthenticated.value) return toast.error(t('product.loginForReviews'))
  await $axios.post(`/api/questions/${question.id}/report`, {}, { withCredentials: true })
  questions.value = questions.value.filter(item => item.id !== question.id)
}

const resetProductPage = () => {
  product.value = null
  specifications.value = []
  reviewSummary.value = { average_rating: '0.00', review_count: 0, distribution: {} }
  reviews.value = []
  questions.value = []
  relatedProducts.value = []
  features.value = []
  is_active.value = []
  quantity.value = 1
}

if (import.meta.server) {
  await getProducts()
}

onMounted(async(): Promise<void> => {
  if (!product.value) await getProducts()
  await Promise.all([
    getProductFeatures(),
    fetchProductEngagement(),
  ])
  rememberRecentlyViewedProduct()
})
watch(() => route.query.vendor_offer_id, async () => { quantity.value = 1; await getProducts() })

watch(slug, async (nextSlug, previousSlug) => {
  if (!previousSlug || nextSlug === previousSlug) return

  resetProductPage()
  try {
    await getProducts()
    await Promise.all([
      getProductFeatures(),
      fetchProductEngagement(),
    ])
    rememberRecentlyViewedProduct()
  } catch (error) {
    showError(error as any)
  }
})






</script>
<template>

  <section class="bg-white">
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">


      

      <!-- LEFT: Images -->
      <!-- LEFT: Images -->
<div class="md:col-span-5">
  <!-- Main gallery -->

  <!-- Breadcrumbs -->
<nav aria-label="Breadcrumb" class="mb-3">
  <ol class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
    <li>
      <NuxtLink :to="localePath('/')" class="hover:text-[#07B6C6]">{{ t('common.home') }}</NuxtLink>
    </li>

    <li class="opacity-60">/</li>

    <li>
      <button
        v-if="deptName"
        type="button"
        @click="goDept"
        class="hover:text-[#07B6C6] font-medium"
      >
        {{ deptName }}
      </button>
      <span v-else class="text-slate-400">{{ t('common.department') }}</span>
    </li>

    <template v-if="subName">
      <li class="opacity-60">/</li>
      <li>
        <button
          type="button"
          @click="goSub"
          class="hover:text-[#07B6C6] font-medium"
        >
          {{ subName }}
        </button>
      </li>
    </template>

    <template v-if="subSubName">
      <li class="opacity-60">/</li>
      <li>
        <button
          type="button"
          @click="goSubSub"
          class="text-slate-900 font-semibold hover:text-[#07B6C6]"
        >
          {{ subSubName }}
        </button>
      </li>
    </template>
  </ol>
</nav>

  <div class="relative group">
    <Swiper
      :slides-per-view="1"
      :space-between="16"
      :onSwiper="onSwiper"
      :onSlideChange="onSlideChange"
      class="overflow-hidden rounded-2xl ring-1 ring-slate-200/70 shadow-sm bg-white"
    >
      <SwiperSlide
        v-for="(img, i) in (product?.images || [])"
        :key="i"
        @click="openLightbox(i)"
        class="bg-white cursor-zoom-in"
      >
        <div class="aspect-[4/3] md:aspect-[5/4] flex items-center justify-center bg-slate-50">
          <StorefrontImage :width="900" :height="900" sizes="90vw md:45vw lg:600px"
            :src="`${$r2Url}/${img.Image_Path}`"
            :alt="productName(product) || 'Product image'"
            class="block max-h-[420px] w-auto object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            :loading="i === 0 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : 'auto'"
             
          />
        </div>
      </SwiperSlide>
    </Swiper>

    <!-- Custom nav -->
    <button
      type="button"
      @click="prevSlide"
      class="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow ring-1 ring-slate-200
             opacity-0 group-hover:opacity-100 transition focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]"
      aria-label="Previous image"
    >
      ‹
    </button>
    <button
      type="button"
      @click="nextSlide"
      class="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 shadow ring-1 ring-slate-200
             opacity-0 group-hover:opacity-100 transition focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]"
      aria-label="Next image"
    >
      ›
    </button>

    <!-- Counter badge -->
    <div
      v-if="product?.images?.length"
      class="absolute bottom-2 right-2 rounded-full bg-slate-900/70 text-white text-xs px-2 py-0.5"
    >
      {{ (activeIndex + 1) }} / {{ product.images.length }}
    </div>
  </div>

  <!-- Thumbnails -->
  <div v-if="product?.images?.length" class="mt-3 flex gap-2 overflow-x-auto pb-1">
    <button
      v-for="(img, i) in product.images"
      :key="`thumb-${i}`"
      type="button"
      @click="goToSlide(i)"
      class="shrink-0 w-16 h-16 md:w-18 md:h-18 rounded-lg overflow-hidden ring-2 transition
             focus:outline-none"
      :class="i === activeIndex
        ? 'ring-[#2f5fb6] shadow-sm'
        : 'ring-slate-200 hover:ring-[#07B6C6]'"
      :title="`Preview ${i+1}`"
    >
      <StorefrontImage :width="144" :height="144" sizes="72px"
        :src="`${$r2Url}/${img.Image_Path}`"
        :alt="`Thumbnail ${i+1}`"
        class="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </button>
  </div>

  <!-- Lightbox -->
  <VueEasyLightbox
    :visible="visible"
    :imgs="product?.images ? product.images.map((img: { Image_Path: any }) => `${$r2Url}/${img.Image_Path}`) : []"
    :index="index"
    @hide="visible = false"
  />
</div>


      <!-- RIGHT: Content -->
      <div class="md:col-span-7 grid grid-cols-1 md:grid-cols-7 gap-6">

        <!-- Product info -->
        <div class="md:col-span-4 space-y-3">
          <div class="inline-flex items-center gap-2 text-xs text-slate-500">
            <span class="inline-flex items-center gap-1 rounded-md ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5">
              {{ t('product.industrialSupply') }}
            </span>
            <span>{{ t('product.code') }}: <span class="font-medium text-slate-700">{{ product?.Inhouse_Barcode_Source }}</span></span>
          </div>

          <h1 class="text-2xl md:text-3xl font-semibold text-slate-900 leading-snug">
            {{ productName(product) }}
          </h1>

          <!-- Meta (ratings/availability placeholders) -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div class="flex items-center gap-2" :aria-label="ratingDisplay.label">
              <div class="flex items-center text-amber-500" aria-hidden="true">
                <span
                  v-for="(state, starIndex) in ratingStars"
                  :key="`rating-star-${starIndex}`"
                  :class="state === 'empty' ? 'text-slate-300' : 'text-amber-500'"
                >
                  ★
                </span>
              </div>
              <span class="font-medium text-slate-700">{{ t('product.ratingSummary', { average: ratingDisplay.average }) }}</span>
              <span class="text-slate-500">{{ t('product.reviewsCount', { count: ratingDisplay.count }) }}</span>
            </div>
             
            <div class="text-emerald-600 font-medium" v-if="Number(product?.Product_Stock ?? 0) > 0">{{ t('product.unitsAvailable', { count: product?.Product_Stock ?? 0 }) }}</div>
            <div class="text-rose-600 font-medium" v-else>{{ t('product.outOfStock') }}</div>
          </div>

          <!-- Small feature bullets (optional) -->
           <!-- Quick spec chips (aligned) -->
            <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <div
                v-for="(item, idx) in normalizedIsActive"
                :key="idx"
                class="rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 min-h-[56px]
                      flex flex-col justify-center"
                :class="!item.value ? 'opacity-70' : ''"
              >
                <div
                  class="text-[11px] uppercase tracking-wide text-slate-500 truncate"
                  :title="item.label"
                >
                  {{ item.label }}
                </div>
                <div
                  class="text-[13px] font-semibold text-slate-900 truncate"
                  :title="item.value || '—'"
                >
                  {{ item.value || '—' }}
                </div>
              </div>

              <!-- Optional empty state -->
              <div
                v-if="(!normalizedIsActive || !normalizedIsActive.length)"
                class="col-span-full text-sm text-slate-500"
              >
                {{ t('product.noFeatureInfo') }}
              </div>
            </div>

          <!-- Bulk pricing tiers -->
          <div v-if="bulkTiers.length" class="mt-4 rounded-xl ring-1 ring-cyan-200 bg-cyan-50/40 p-4">
            <h2 class="text-sm font-semibold text-slate-900">{{ t('product.bulkPricing') }}</h2>
            <div class="mt-2 overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th class="py-1.5 pr-3 font-medium">{{ t('product.bulkQtyRange') }}</th>
                    <th class="py-1.5 font-medium">{{ t('product.bulkUnitPrice') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(tier, tierIndex) in bulkTiers"
                    :key="`bulk-tier-${tierIndex}`"
                    class="border-t border-cyan-100"
                    :class="activeBulkTier && activeBulkTier.min_qty === tier.min_qty
                      ? 'font-semibold text-cyan-800'
                      : 'text-slate-700'"
                  >
                    <td class="py-1.5 pr-3">{{ formatBulkTierRange(tier) }}</td>
                    <td class="py-1.5">{{ t('common.omr') }} {{ Number(tier.unit_price).toFixed(3) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Purchase card -->
        <div class="md:col-span-3">
          <div class="w-full md:sticky md:top-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <!-- Desktop price -->
            <div class="hidden md:block">
              <div class="text-xs font-medium text-slate-500 mb-1">{{ t('product.webPrice') }}</div>
              <div class="text-[28px] leading-8 font-bold text-emerald-600">
                {{ t('common.omr') }} {{ productFinalPrice.toFixed(3) }}
                <span class="text-sm font-normal text-slate-500">/ {{ t('product.each') }}</span>
              </div>
              <div v-if="productHasDiscount" class="mt-1 flex flex-wrap items-center gap-2">
                <span class="text-sm text-slate-400 line-through">{{ t('common.omr') }} {{ productOriginalPrice.toFixed(3) }}</span>
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {{ t('listing.saveAmount', { amount: productUnitDiscount.toFixed(3) }) }}
                </span>
              </div>
            </div>

            <fieldset v-if="sellerOffers.length" class="my-4 rounded-xl border border-slate-200 p-3">
              <legend class="px-1 text-sm font-semibold">{{ locale === 'ar' ? 'اختر البائع' : 'Choose a seller' }}</legend>
              <label v-for="offer in sellerOffers" :key="offer.vendor_offer_id ?? 'own'" class="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                <input :disabled="offerLoading" type="radio" name="seller-offer" :checked="(product?.Vendor_Offer_Id ?? null) === offer.vendor_offer_id"
                  @change="router.replace({ path: route.path, query: { ...route.query, vendor_offer_id: offer.vendor_offer_id || undefined } })" />
                <span class="flex-1">{{ offer.seller_name }}</span>
                <span class="font-semibold">{{ t('common.omr') }} {{ Number(offer.price).toFixed(3) }}</span>
                <span class="text-xs text-slate-500">{{ offer.stock > 0 ? (locale === 'ar' ? 'متوفر' : 'In stock') : (locale === 'ar' ? 'غير متوفر' : 'Out of stock') }}</span>
              </label>
            </fieldset>
            <!-- Mobile compact row -->
            <div class="md:hidden">
              <div class="flex items-center justify-between text-sm">
                <div>
                  <div class="text-slate-500">{{ t('product.price') }}</div>
                  <div class="text-emerald-600 font-semibold">
                    {{ t('common.omr') }} {{ productFinalPrice.toFixed(3) }}
                    <span class="text-xs text-slate-500 font-normal">/ {{ t('product.each') }}</span>
                  </div>
                  <div v-if="productHasDiscount" class="text-xs text-slate-400 line-through">
                    {{ t('common.omr') }} {{ productOriginalPrice.toFixed(3) }}
                  </div>
                </div>
                <div>
                  <div class="text-slate-500">{{ t('product.subTotal') }}</div>
                  <div class="font-semibold">
                    {{ (effectiveUnitPrice * (quantity || 1)).toFixed(3) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Qty -->
            <div class="mt-4">
              <label class="text-sm font-semibold block mb-1 text-slate-700">{{ t('product.quantity') }}</label>
              <div class="flex items-center gap-2">
                <button
                  @click="decrementQty()"
                  class="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200"
                  aria-label="Decrease quantity"
                >−</button>
                <input
                  type="number"
                  v-model.number="quantity"
                  min="1"
                  class="w-20 h-9 border border-slate-300 text-center rounded-lg text-sm focus:ring-2 focus:ring-[#00bfa5] focus:outline-none"
                   disabled
                   />
                <button
                  @click="incrementQty()"
                  class="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200"
                  aria-label="Increase quantity"
                >+</button>
              </div>
              <!-- Live bulk-tier hint -->
              <p v-if="activeBulkTier" class="mt-2 text-xs font-semibold text-cyan-700">
                {{ t('product.bulkApplied', { price: Number(activeBulkTier.unit_price).toFixed(3) }) }}
              </p>
            </div>


            <!-- Favorite button -->
              <button
                type="button"
                @click="toggleFavorite"
                :disabled="favBusy"
                class="mt-3 inline-flex items-center justify-center gap-2 w-full
                      rounded-xl ring-1 ring-slate-200 bg-white hover:bg-rose-50
                      text-sm font-medium text-slate-700 px-3 py-2 transition
                      disabled:opacity-60"
                :aria-pressed="isFavorited"
              >
                <!-- Heart icon (animated) -->
                <span class="relative inline-flex">
                  <!-- filled when favorited -->
                  <svg v-if="isFavorited" class="h-5 w-5 text-rose-500 transition-transform duration-150 scale-110"
                      viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11.99 21s-6.72-4.35-9.54-7.17A6.37 6.37 0 0 1 3 3.88a5 5 0 0 1 7.07 0l1.92 1.93 1.93-1.93A5 5 0 0 1 21 3.88a6.37 6.37 0 0 1 .55 9.95C18.73 16.65 12 21 11.99 21z"/>
                  </svg>
                  <!-- outline when not favorited -->
                  <svg v-else class="h-5 w-5 text-rose-500 transition-transform duration-150 group-hover:scale-110"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
                    <path d="M12 21s-6.5-4.4-9.3-7.2A6.3 6.3 0 0 1 3 4a5 5 0 0 1 7.1 0L12 5.9 13.9 4A5 5 0 0 1 21 4a6.3 6.3 0 0 1 .3 9.8C18.5 16.6 12 21 12 21z"/>
                  </svg>
                  <!-- subtle ping when adding -->
                  <span v-if="favBusy" class="absolute inset-0 rounded-full animate-ping bg-rose-400/40"></span>
                </span>

                <span>{{ isFavorited ? t('product.favorited') : t('product.addToFavorites') }}</span>
              </button>


            <!-- Add to cart -->
            <button
              v-if="!isOutOfStock"
              :disabled="offerLoading"
              @click="addToCart"
              class="mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#00e676] hover:from-[#00a388] hover:to-[#00c853]
                     text-white text-sm font-semibold py-2.5 rounded-xl shadow transition"
            >
              {{ t('product.addToCart') }}
            </button>

            <button
              v-else
              type="button"
              :disabled="backInStockBusy"
              @click="requestBackInStockAlert"
              class="mt-4 w-full rounded-xl bg-cyan-700 px-3 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-800 disabled:opacity-60"
            >
              {{ backInStockBusy ? t('product.savingAlert') : t('product.notifyWhenAvailable') }}
            </button>
            <p v-if="backInStockMessage" class="mt-2 text-xs text-slate-600">{{ backInStockMessage }}</p>

            <!-- Trust signals -->
            <div class="mt-4 space-y-2 text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l9 4v6c0 5-3.8 9.7-9 11-5.2-1.3-9-6-9-11V5l9-4z"/></svg>
                {{ t('product.secureCheckout') }}
              </div>
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-cyan-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"/></svg>
                {{ t('product.fastDispatch') }}
              </div>
              <!-- <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 015 5v4h3v2H4v-2h3v-4a5 5 0 015-5z"/></svg>
                7-day returns on unused items
              </div> -->
            </div>
          </div>
        </div>
      </div>

      <!-- Features -->
      <div class="md:col-span-12 mt-8">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">{{ t('product.specifications') }}</h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
            <div
              v-for="(feature, i) in (features || [])"
              :key="i"
              class="rounded-lg bg-slate-50/60 ring-1 ring-slate-200 px-3 py-2"
            >
              <div class="text-slate-600 text-xs uppercase tracking-wide mb-1">{{ field(feature.description, 'Product_Specification_Description_Name') }}</div>
              <div class="font-medium">
                {{ field(feature.spec_value, 'value') }}
              </div>
            </div>
            <div v-if="!features || features.length === 0" class="text-slate-500">
              {{ t('product.noFeatureInfo') }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="relatedProducts.length || recentlyViewedProducts.length" class="md:col-span-12 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section v-if="relatedProducts.length" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg md:text-xl font-semibold text-slate-900">{{ t('product.relatedProducts') }}</h2>
            <NuxtLink v-if="subSub?.Slug" :to="`/departments/${subSub.Slug}`" class="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
              {{ t('common.viewAll') }}
            </NuxtLink>
          </div>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="item in relatedProducts"
              :key="`related-${item.id}`"
              type="button"
              class="group flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:border-cyan-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              :aria-label="t('listing.viewProduct', { name: productName(item) })"
              @click="openProductCard(item)"
            >
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                <img
                  v-if="productCardImage(item)"
                  :src="`${$r2Url}/${productCardImage(item)}`"
                  :alt="productName(item)"
                  class="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div class="min-w-0">
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-cyan-800">{{ productName(item) }}</div>
                <div class="mt-1 text-sm font-semibold text-emerald-600">{{ productCardPrice(item).toFixed(3) }} {{ t('common.omr') }}</div>
                <div class="mt-1 text-xs text-slate-500" :aria-label="formatRatingSummary(item.review_summary).label">
                  ★ {{ formatRatingSummary(item.review_summary).average }} ({{ formatRatingSummary(item.review_summary).count }})
                </div>
              </div>
            </button>
          </div>
        </section>

        <section v-if="recentlyViewedProducts.length" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">{{ t('product.recentlyViewed') }}</h2>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="item in recentlyViewedProducts"
              :key="`recent-${item.slug || item.id}`"
              type="button"
              class="group flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left transition hover:border-cyan-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              :aria-label="t('listing.viewProduct', { name: productName(item) })"
              @click="openProductCard(item)"
            >
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                <img
                  v-if="productCardImage(item)"
                  :src="`${$r2Url}/${productCardImage(item)}`"
                  :alt="productName(item)"
                  class="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div class="min-w-0">
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-cyan-800">{{ productName(item) }}</div>
                <div class="mt-1 text-sm font-semibold text-emerald-600">{{ productCardPrice(item).toFixed(3) }} {{ t('common.omr') }}</div>
              </div>
            </button>
          </div>
        </section>
      </div>

      <div class="md:col-span-12 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg md:text-xl font-semibold text-slate-900">{{ t('product.reviews') }}</h2>
              <p class="mt-1 text-sm text-slate-600">{{ ratingDisplay.label }}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-amber-600">{{ ratingDisplay.average }}</div>
              <div class="flex text-amber-500" aria-hidden="true">
                <span v-for="(state, starIndex) in ratingStars" :key="`summary-star-${starIndex}`" :class="state === 'empty' ? 'text-slate-300' : 'text-amber-500'">★</span>
              </div>
            </div>
          </div>

          <div v-if="engagementLoading" role="status" class="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {{ t('common.loading') }}
          </div>

          <div v-else class="mt-5 space-y-4">
            <article v-for="review in reviews" :key="review.id" class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 class="font-semibold text-slate-900">{{ review.Title || t('product.reviews') }}</h3>
                  <p class="text-xs text-slate-500">{{ review.customer?.Customer_Full_Name || 'Customer' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="review.Verified_Purchase" class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{{ t('product.verifiedPurchase') }}</span>
                  <span class="text-sm font-semibold text-amber-600">{{ review.Rating }}/5</span>
                </div>
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-700">{{ review.Body }}</p>
              <div v-if="review.replies?.length" class="mt-3 space-y-2">
                <div v-for="reply in review.replies" :key="reply.id" class="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  <div class="mb-1 text-xs font-semibold uppercase text-slate-500">{{ t('product.replyFrom', { type: reply.Reply_Type }) }}</div>
                  {{ reply.Body }}
                </div>
              </div>
              <div class="mt-3 flex items-center gap-3 text-xs">
                <button type="button" class="font-medium text-cyan-700 hover:text-cyan-900" @click="markReviewHelpful(review)">
                  {{ t('product.helpful') }} ({{ review.Helpful_Count || 0 }})
                </button>
                <button type="button" class="font-medium text-rose-700 hover:text-rose-900" @click="reportReview(review)">
                  {{ t('product.report') }}
                </button>
              </div>
            </article>
            <div v-if="!reviews.length" role="status" class="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {{ t('product.noReviews') }}
            </div>
          </div>

          <form class="mt-5 rounded-xl border border-slate-200 bg-white p-4" @submit.prevent="submitReview">
            <h3 class="font-semibold text-slate-900">{{ t('product.writeReview') }}</h3>
            <p v-if="!isAuthenticated" class="mt-2 text-sm text-slate-500">{{ t('product.loginForReviews') }}</p>
            <div class="mt-3 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
              <label class="text-sm font-medium text-slate-700">
                {{ t('product.rating') }}
                <select v-model.number="reviewForm.rating" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option v-for="rating in [5,4,3,2,1]" :key="rating" :value="rating">{{ rating }}</option>
                </select>
              </label>
              <label class="text-sm font-medium text-slate-700">
                {{ t('product.reviewTitle') }}
                <input v-model.trim="reviewForm.title" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxlength="160" />
              </label>
            </div>
            <label class="mt-3 block text-sm font-medium text-slate-700">
              {{ t('product.reviewBody') }}
              <textarea v-model.trim="reviewForm.body" class="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" required minlength="5"></textarea>
            </label>
            <button type="submit" :disabled="reviewBusy || !isAuthenticated" class="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">
              {{ reviewBusy ? t('common.loading') : t('product.submitReview') }}
            </button>
            <p v-if="reviewMessage" class="mt-2 text-sm text-slate-600">{{ reviewMessage }}</p>
          </form>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">{{ t('product.questions') }}</h2>
          <div class="mt-5 space-y-4">
            <article v-for="question in questions" :key="question.id" class="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p class="font-semibold text-slate-900">{{ question.Question }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ question.customer?.Customer_Full_Name || 'Customer' }}</p>
              <div v-if="question.answers?.length" class="mt-3 space-y-2">
                <div v-for="answer in question.answers" :key="answer.id" class="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  <div class="mb-1 text-xs font-semibold uppercase text-slate-500">{{ t('product.replyFrom', { type: answer.Answer_Type }) }}</div>
                  {{ answer.Body }}
                </div>
              </div>
              <div class="mt-3 flex items-center gap-3 text-xs">
                <button type="button" class="font-medium text-cyan-700 hover:text-cyan-900" @click="markQuestionHelpful(question)">
                  {{ t('product.helpful') }} ({{ question.Helpful_Count || 0 }})
                </button>
                <button type="button" class="font-medium text-rose-700 hover:text-rose-900" @click="reportQuestion(question)">
                  {{ t('product.report') }}
                </button>
              </div>
            </article>
            <div v-if="!questions.length" role="status" class="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {{ t('product.noQuestions') }}
            </div>
          </div>

          <form class="mt-5 rounded-xl border border-slate-200 bg-white p-4" @submit.prevent="submitQuestion">
            <h3 class="font-semibold text-slate-900">{{ t('product.askQuestion') }}</h3>
            <p v-if="!isAuthenticated" class="mt-2 text-sm text-slate-500">{{ t('product.loginForReviews') }}</p>
            <label class="mt-3 block text-sm font-medium text-slate-700">
              {{ t('product.questionBody') }}
              <textarea v-model.trim="questionForm.question" class="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" required minlength="5"></textarea>
            </label>
            <button type="submit" :disabled="questionBusy || !isAuthenticated" class="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">
              {{ questionBusy ? t('common.loading') : t('product.submitQuestion') }}
            </button>
            <p v-if="questionMessage" class="mt-2 text-sm text-slate-600">{{ questionMessage }}</p>
          </form>
        </section>
      </div>

    

    </div>
  </div>
  </section>

 
</template>
