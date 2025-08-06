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
  images: ProductImage[]; // updated to support multiple images
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
  <section class="bg-white py-10 px-6 max-w-screen-xl mx-auto">
     
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Product Image -->
        <div class="md:w-2/5">

          <Swiper
            :slides-per-view="1"
            class="rounded-lg shadow-md overflow-hidden"
          >
  <SwiperSlide
    v-for="(img, i) in product?.images || []"
    :key="i"
    @click="openLightbox(i)"
  >
    <img
      :src="`${$r2Url}/${img.Image_Path}`"
      class="object-contain w-full h-[320px] cursor-zoom-in"
      alt="Product Image"
    />
  </SwiperSlide>
</Swiper>

<VueEasyLightbox
  :visible="visible"
:imgs="product?.images ? product.images.map(img => `${$r2Url}/${img.Image_Path}`) : []"
  :index="index"
  @hide="visible = false"
/>
     
      </div>

      <!-- Product Info -->
      <div class="md:w-2/3 flex flex-col md:flex-row justify-between">
        <div class="md:w-3/4 space-y-3">
          <h1 class="text-xl font-bold text-gray-800 leading-tight">
            {{ product?.Product_Name }}
          </h1>
          <p class="text-sm text-gray-600">Item Code : {{ product?.Inhouse_Barcode_Source }}</p>

          <div class="text-sm mt-4">
            
          </div>

          <div class="flex space-x-2 mt-2">
            
          </div>
        </div>

    <!-- Purchase Box -->
     <!-- Product Action Section -->
<div class="md:w-[320px] w-full mt-6 md:mt-0 border rounded-2xl p-6 shadow-xl bg-white">

  <!-- Mobile View: Stacked, Tight Layout -->
  <div class="block md:hidden space-y-3">
    <!-- Price, Qty, Subtotal in one row -->
    <div class="flex items-center justify-between text-sm font-medium text-gray-700">
      <div>
        <div class="text-gray-500">Price</div>
        <div class="text-green-600 font-bold">
          OMR {{ product?.Product_Price ?? '0.00' }}
          <span class="text-xs text-gray-500 font-normal">/ each</span>
        </div>
      </div>

      <!-- Qty -->
      <div class="flex items-center gap-1">
        <button @click="quantity = Math.max(1, quantity - 1)" class="px-2 py-1 border rounded bg-gray-100">-</button>
        <input type="number" v-model="quantity" min="1" class="w-12 text-center border rounded text-sm" />
        <button @click="quantity++" class="px-2 py-1 border rounded bg-gray-100">+</button>
      </div>

      <!-- Subtotal -->
      <div>
        <div class="text-gray-500">Sub Total</div>
        <div class="font-semibold">
          {{ ((product?.Product_Price ?? 0) * quantity).toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Add to Cart Button -->
    <button
      @click="addToCart"
      class="w-full bg-gradient-to-r from-[#00bfa5] to-[#00e676] hover:from-[#00a388] hover:to-[#00c853] text-white text-sm font-semibold py-2.5 rounded-xl shadow-md transition"
    >
      Add to Cart
    </button>
  </div>

  <!-- Desktop View: Original Layout -->
  <div class="hidden md:block">
  <!-- Price -->
  <div class="text-sm text-gray-500 font-medium mb-1">Web Price</div>
  <div class="text-3xl font-bold text-green-600 mb-3">
    OMR {{ product?.Product_Price ?? '0.00' }}
    <span class="text-sm font-normal text-gray-600">/ each</span>
  </div>

  <!-- Quantity -->
  <label class="text-sm font-semibold block mb-1 text-gray-700">Qty</label>
  <div class="flex items-center space-x-2 mb-5">
    <!-- Decrement Button -->
    <button
      @click="decrementQty()"
      class="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition"
    >−</button>

    <!-- Quantity Input -->
    <input
      type="number"
      v-model.number="quantity"
      min="1"
      class="w-16 border border-gray-300 text-center px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#00bfa5] focus:outline-none"
    />

    <!-- Increment Button -->
    <button
      @click="incrementQty()"
      class="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition"
    >+</button>
  </div>

  <!-- Add to Cart -->
  <button
    @click="addToCart"
    class="w-full bg-gradient-to-r from-[#00bfa5] to-[#00e676] hover:from-[#00a388] hover:to-[#00c853] text-white text-sm font-semibold py-2.5 rounded-xl shadow-md transition"
  >
    Add to Cart
  </button>
</div>




</div>

    



      </div>


      
    </div>

    <!-- Product Details Table -->
    <div class="mt-10 border-t pt-6">
      <h2 class="text-xl font-semibold mb-4">Product Features</h2>
      <hr class="mb-6 border-gray-300" />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-3 text-sm text-gray-700">

         <div v-for="(group, i) in specifications" :key="i">
    <div > <strong>{{ group.category }} </strong> <template v-for="(val, j) in group.values" :key="j">{{ val }}</template></div>
    
  </div>
        
      </div>
    </div>

    


    <div class="mt-10 border-t pt-6">

      <h2 class="text-xl font-semibold mb-4">Product Description</h2>
      <p class="text-sm text-gray-700">
        {{ product?.Product_Description || 'No description available.' }}
      </p>
    </div>


  </section>
</template>


