<script setup lang="ts">
definePageMeta({
    layout: 'layouts',
  })
import { ref, onMounted } from 'vue'
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



function openLightbox(i: number) {
  index.value = i
  visible.value = true
}

 interface ProductImage {
  Image_Path: string;
}

interface Product {
  id: number;
  Product_Name: string;
  Slug: string;
  Product_Price: number;
  Inhouse_Barcode_Source: string;
  Product_Description: string;
  Product_Stock: string;
  images: ProductImage[]; // updated to support multiple images
  Weight_Kg: number;
  Length_Cm: number;
  Width_Cm: number;
  Height_Cm: number;

}

interface SpecificationGroup {
  category: string;
  values: string[];
}

interface ProductDetailsResponse {
  product: Product;
  specifications: SpecificationGroup[];
}


const product = ref<Product | null>(null)
const specifications = ref<SpecificationGroup[]>([])


const incrementQty = () => {
  quantity.value++
}

const decrementQty = () => {
  if (quantity.value > 1) quantity.value--
}


const addToCart = () => {
  if (!product.value) return

  cart.addToCart({
    id: product.value.id,
    slug: product.value.Slug,
    name: product.value.Product_Name,
    price: product.value.Product_Price,
    quantity: quantity.value,
    image: product.value.images?.[0]?.Image_Path || '',
    weight: product.value.Weight_Kg,
  
      length: product.value.Length_Cm,
      width: product.value.Width_Cm,
      height: product.value.Height_Cm
 
  })

  toast.success(`${product.value.Product_Name} added to cart`)
  router.push('/cart');
}


const getProducts = async (): Promise<void> => {
  try {
    const response = await $axios.get(`/api/products/details/${slug}`)
 
      product.value =  {
                        ...response.data.product,
                        price: parseFloat(response.data.product.price)
                       };
      specifications.value = response.data.specifications;
 
  } catch (error) {
    console.error('Error fetching product:', error)
  }
}


onMounted(async(): Promise<void> => {
     await getProducts();
})






</script>
<template>

  <section class="bg-white">
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

      <!-- LEFT: Images -->
      <div class="md:col-span-5">
        <!-- Main gallery -->
        <Swiper
          :slides-per-view="1"
          class="overflow-hidden rounded-2xl ring-1 ring-slate-200/70 shadow-sm bg-white"
        >
          <SwiperSlide
            v-for="(img, i) in (product?.images || [])"
            :key="i"
            @click="openLightbox(i)"
            class="bg-white cursor-zoom-in"
          >
            <img
              :src="`${$r2Url}/${img.Image_Path}`"
              :alt="product?.Product_Name || 'Product image'"
              class="block w-full h-[360px] md:h-[420px] object-contain"
              loading="lazy"
              decoding="async"
            />
          </SwiperSlide>
        </Swiper>

        <!-- Thumbnails -->
        <div
          v-if="product?.images?.length"
          class="mt-3 flex gap-2 overflow-x-auto pb-1"
        >
          <button
            v-for="(img, i) in product.images"
            :key="`thumb-${i}`"
            type="button"
            @click="openLightbox(i)"
            class="shrink-0 w-16 h-16 md:w-18 md:h-18 rounded-lg ring-1 ring-slate-200 hover:ring-cyan-300 bg-white overflow-hidden"
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
          :imgs="product?.images ? product.images.map(img => `${$r2Url}/${img.Image_Path}`) : []"
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
          <ul class="mt-2 space-y-1.5 text-sm text-slate-700">
            <li class="flex items-start gap-2">
              <svg class="mt-0.5 h-4 w-4 text-cyan-600" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293l-8.5 8.5-4-4L5.707 8.293l2.5 2.5 7.5-7.5z"/></svg>
              Durable, industry-grade build for heavy use
            </li>
            <li class="flex items-start gap-2">
              <svg class="mt-0.5 h-4 w-4 text-cyan-600" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293l-8.5 8.5-4-4L5.707 8.293l2.5 2.5 7.5-7.5z"/></svg>
              Backed by ISC quality assurance
            </li>
            <li class="flex items-start gap-2">
              <svg class="mt-0.5 h-4 w-4 text-cyan-600" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293l-8.5 8.5-4-4L5.707 8.293l2.5 2.5 7.5-7.5z"/></svg>
              Fast dispatch with trusted couriers
            </li>
          </ul>
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
                />
                <button
                  @click="incrementQty()"
                  class="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200"
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>

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
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 015 5v4h3v2H4v-2h3v-4a5 5 0 015-5z"/></svg>
                7-day returns on unused items
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features -->
      <div class="md:col-span-12 mt-8">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">Product Features</h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
            <div
              v-for="(group, i) in (specifications || [])"
              :key="i"
              class="rounded-lg bg-slate-50/60 ring-1 ring-slate-200 px-3 py-2"
            >
              <div class="text-slate-600 text-xs uppercase tracking-wide mb-1">{{ group.category }}</div>
              <div class="font-medium">
                <template v-for="(val, j) in group.values" :key="j">
                  <span>{{ val }}</span><span v-if="j < group.values.length - 1"> · </span>
                </template>
              </div>
            </div>
            <div v-if="!specifications || specifications.length === 0" class="text-slate-500">
              No feature information available.
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="md:col-span-12">
        <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg md:text-xl font-semibold text-slate-900">Product Description</h2>
          <p class="mt-3 text-sm leading-6 text-slate-700">
            {{ product?.Product_Description || 'No description available.' }}
          </p>
        </div>
      </div>

    </div>
  </div>
</section>

 
</template>


