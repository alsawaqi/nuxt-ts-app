<script setup lang="ts">
definePageMeta({
    layout: 'layouts',
  })
import { ref, onMounted } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'


const { $axios, $r2Url } = useNuxtApp()

const slug = useParam('slug')

const quantity = ref(25)

const visible = ref(false)
const index = ref(0)

function openLightbox(i: number) {
  index.value = i
  visible.value = true
}

 interface ProductImage {
  image_path: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  inhouse_barcode: string;
  description: string;
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
  <section class="bg-white py-10 px-6 max-w-screen-2xl mx-auto">
     
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
      :src="`${$r2Url}/${img.image_path}`"
      class="object-contain w-full h-[320px] cursor-zoom-in"
      alt="Product Image"
    />
  </SwiperSlide>
</Swiper>

<VueEasyLightbox
  :visible="visible"
:imgs="product?.images ? product.images.map(img => `${$r2Url}/${img.image_path}`) : []"
  :index="index"
  @hide="visible = false"
/>
     
      </div>

      <!-- Product Info -->
      <div class="md:w-2/3 flex flex-col md:flex-row justify-between">
        <div class="md:w-3/4 space-y-3">
          <h1 class="text-xl font-bold text-gray-800 leading-tight">
            {{ product?.name }}
          </h1>
          <p class="text-sm text-gray-600">Item Code {{ product?.inhouse_barcode }}</p>

          <div class="text-sm mt-4">
            
          </div>

          <div class="flex space-x-2 mt-2">
            
          </div>
        </div>

        <!-- Purchase Box -->
         <div class="md:w-[320px] w-full mt-6 md:mt-0 border rounded-2xl p-6 shadow-xl bg-white">
  <!-- Price -->
  <div class="text-sm text-gray-500 font-medium mb-1">Web Price</div>
          <div class="text-3xl font-bold text-green-600 mb-3">
           OMR {{ product?.price ? product.price.toFixed(2) : '0.00' }}
            <span class="text-sm font-normal text-gray-600">/ each</span>
          </div>

  <!-- Quantity -->
  <label class="text-sm font-semibold block mb-1 text-gray-700">Qty</label>
  <input
    type="number"
    v-model="quantity"
    min="1"
    class="w-full border border-gray-300 px-3 py-2 rounded-lg mb-5 text-sm focus:ring-2 focus:ring-[#00bfa5] focus:outline-none"
  />

  <!-- Add to Cart -->
  <button
    class="w-full bg-gradient-to-r from-[#00bfa5] to-[#00e676] hover:from-[#00a388] hover:to-[#00c853] text-white text-sm font-semibold py-2.5 rounded-xl shadow-md transition"
  >
    Add to Cart
  </button>

  <!-- Shipping & Pickup -->
  <div class="mt-5 space-y-3 text-sm text-gray-700">


     

    



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
        {{ product?.description || 'No description available.' }}
      </p>
    </div>


  </section>
</template>


