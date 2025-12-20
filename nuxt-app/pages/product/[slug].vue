<script setup lang="ts">
definePageMeta({
    layout: 'layouts',
  })
import { ref, onMounted, computed } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'
import { useCartStore } from '~/stores/cart'
import { useToast } from 'vue-toastification'

import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'
import { useRouter } from 'vue-router'

const router = useRouter()


const { $axios, $r2Url } = useNuxtApp()

const slug = useParam('slug');

const cart = useCartStore()
const toast = useToast()
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
  id: number;
  Product_Name: string;
  Slug: string;
  Product_Price: number;
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
}


// --- Safe accessors for names/ids/slugs ---
const dept    = computed(() => product.value?.department ?? null)
const sub     = computed(() => product.value?.subdepartment ?? null)
const subSub  = computed(() => product.value?.sub_sub_department ?? null)

const deptName   = computed(() => dept.value?.Product_Department_Name ?? '')
const subName    = computed(() => sub.value?.Sub_Department_Name ?? '')
const subSubName = computed(() => subSub.value?.Product_Sub_Sub_Department_Name ?? '')

// --- Breadcrumb navigation helpers ---
const goDept = () => {
  if (!dept.value?.id) return
  router.push({
    path: '/',
    query: { deptId: dept.value.id }
  })
}

const goSub = () => {
  if (!dept.value?.id || !sub.value?.id) return
  router.push({
    path: '/',
    query: { deptId: dept.value.id, subId: sub.value.id }
  })
}

const goSubSub = () => {
  if (!subSub.value?.Slug) return
  // Goes to /departments/<slug> as requested. We also pass ids to keep context.
  router.push({
    path: `/departments/${subSub.value.Slug}`,
    query: {
      deptId: dept.value?.id ?? undefined,
      subId:  sub.value?.id ?? undefined,
      subSubId: subSub.value?.id ?? undefined
    }
  })
}


const product = ref<Product | null>(null)
const specifications = ref<SpecificationGroup[]>([])


const getProductFeatures = async (): Promise<void> => {
    
    try{
        const response = await $axios.get(`/api/products/value/${slug}`);
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
      value: x?.spec_value?.value ?? '',
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
  if (p) loadLocalFav()
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
    toast.success(isFavorited.value ? 'Added to favorites' : 'Removed from favorites')
  } catch (e: any) {
    // revert on error
    isFavorited.value = prev
    setLocalFav(prev)
    toast.error(e?.response?.status === 401 ? 'Please log in to use favorites' : 'Couldn’t update favorite')
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
  if (!product.value) return;

  const stock = Number(product.value.Product_Stock ?? 0)
  if (stock <= 0) {
    toast.error('This product is out of stock.')
    return
  }

  try {
    await cart.addToCart(
      {
        id: product.value.id,
        slug: product.value.Slug,
        name: product.value.Product_Name,
        price: product.value.Product_Price,
        image: product.value.images?.[0]?.Image_Path || '',
        weight: product.value.Weight_Kg,
        length: product.value.Length_Cm,
        width: product.value.Width_Cm,
        height: product.value.Height_Cm,
        Product_Stock: product.value.Product_Stock, // Pass the stock
      },
      quantity.value
    );

    toast.success(`${product.value.Product_Name} added to cart`);
  } catch (e: any) {
    toast.error(e?.response?.status === 401 ? "Please login to add to cart" : "Could not add to cart");
  }
};



const getProducts = async (): Promise<void> => {
  try {
    const response = await $axios.get(`/api/products/details/${slug}`)
 
      product.value =  {
                        ...response.data.product,
                        price: parseFloat(response.data.product.price)
                       };
      specifications.value = response.data.specifications;

      console.log('Fetched product:', product.value);
 
  } catch (error) {
    console.error('Error fetching product:', error)
  }
}


onMounted(async(): Promise<void> => {
     await getProducts();
      await getProductFeatures();
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
      <NuxtLink to="/" class="hover:text-[#07B6C6]">Home</NuxtLink>
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
      <span v-else class="text-slate-400">Department</span>
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
          {{ subSubName }}s
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
          <img
            :src="`${$r2Url}/${img.Image_Path}`"
            :alt="product?.Product_Name || 'Product image'"
            class="block max-h-[420px] w-auto object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            loading="lazy"
             
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
      <img
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
              Industrial Supply
            </span>
            <span>Code: <span class="font-medium text-slate-700">{{ product?.Inhouse_Barcode_Source }}</span></span>
          </div>

          <h1 class="text-2xl md:text-3xl font-semibold text-slate-900 leading-snug">
            {{ product?.Product_Name }}
          </h1>

          <!-- Meta (ratings/availability placeholders) -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <div class="flex items-center gap-1 text-amber-500">
              
            </div>
             
            <div class="text-emerald-600 font-medium" v-if="Number(product?.Product_Stock ?? 0) > 0">{{ product?.Product_Stock }} units available</div>
            <div class="text-rose-600 font-medium" v-else>Out of stock</div>
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
                No feature information available.
              </div>
            </div>

       
          
        </div>

        <!-- Purchase card -->
        <div class="md:col-span-3">
          <div class="w-full md:sticky md:top-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <!-- Desktop price -->
            <div class="hidden md:block">
              <div class="text-xs font-medium text-slate-500 mb-1">Web Price</div>
              <div class="text-[28px] leading-8 font-bold text-emerald-600">
                OMR {{ product?.Product_Price ?? '0.00' }}
                <span class="text-sm font-normal text-slate-500">/ each</span>
              </div>
            </div>

            <!-- Mobile compact row -->
            <div class="md:hidden">
              <div class="flex items-center justify-between text-sm">
                <div>
                  <div class="text-slate-500">Price</div>
                  <div class="text-emerald-600 font-semibold">
                    OMR {{ product?.Product_Price ?? '0.00' }}
                    <span class="text-xs text-slate-500 font-normal">/ each</span>
                  </div>
                </div>
                <div>
                  <div class="text-slate-500">Sub Total</div>
                  <div class="font-semibold">
                    {{ ((product?.Product_Price ?? 0) * (quantity || 1)).toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Qty -->
            <div class="mt-4">
              <label class="text-sm font-semibold block mb-1 text-slate-700">Quantity</label>
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

                <span>{{ isFavorited ? 'Favorited' : 'Add to Favorites' }}</span>
              </button>


            <!-- Add to cart -->
            <button
              @click="addToCart"
              class="mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#00e676] hover:from-[#00a388] hover:to-[#00c853]
                     text-white text-sm font-semibold py-2.5 rounded-xl shadow transition"
            >
              Add to Cart
            </button>

            <!-- Trust signals -->
            <div class="mt-4 space-y-2 text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l9 4v6c0 5-3.8 9.7-9 11-5.2-1.3-9-6-9-11V5l9-4z"/></svg>
                Secure checkout • SSL encrypted
              </div>
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-cyan-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"/></svg>
                Fast dispatch from ISC warehouse
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
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">Product Specifications</h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
            <div
              v-for="(feature, i) in (features || [])"
              :key="i"
              class="rounded-lg bg-slate-50/60 ring-1 ring-slate-200 px-3 py-2"
            >
              <div class="text-slate-600 text-xs uppercase tracking-wide mb-1">{{ feature.description?.Product_Specification_Description_Name }}</div>
              <div class="font-medium">
                {{ feature.spec_value?.value }} 
              </div>
            </div>
            <div v-if="!features || features.length === 0" class="text-slate-500">
              No feature information available.
            </div>
          </div>
        </div>
      </div>

    

    </div>
  </div>
  </section>

 
</template>


