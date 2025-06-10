<script setup lang="ts">
definePageMeta({
  layout: 'layout',
})
import { ref, watch,onMounted } from 'vue'
const { $axios } = useNuxtApp();

interface ProductDepartment {
  id: number;
  Product_Department_Name: string;
  
}


const currentSection = ref<'categories' | 'products' | 'brand'>('categories')
const hideTopbar = ref(false)
const hideBanner = ref(false)
const prodcutsDepartments = ref<ProductDepartment[]>([])
const bannerStyle = 'background-image: url(\'https://www.aabtools.com/banner/HomePageBanner/Desktop/Megger_Desktop.webp\')'

const viewMode = ref<'grid' | 'list'>('grid')


const subCategories = ref<any[]>([])
const subSubCategories = ref<any[]>([])

const selectedDepartment = ref<number | null>(null)
const selectedSubCategory = ref<number | null>(null)



function resetToMainCategory() {
  selectedDepartment.value = null
  selectedSubCategory.value = null
  subCategories.value = []
  subSubCategories.value = []
}


const fetchData = async () => {
  try {
    const response = await $axios.get('/api/productdepartment')
    // Process the response data as needed
    console.log(response.data);
    prodcutsDepartments.value = response.data;
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}



const fetchSubCategories = async (departmentId: number) => {
  selectedDepartment.value = departmentId
  const response = await $axios.get(`/api/categories/${departmentId}/subcategories`)
  subCategories.value = response.data
  subSubCategories.value = [] // Reset
}

// Fetch sub-subcategories
const fetchSubSubCategories = async (subCategoryId: number) => {
  selectedSubCategory.value = subCategoryId
  const response = await $axios.get(`/api/subcategories/${subCategoryId}/subsubcategories`)
  subSubCategories.value = response.data
}


onMounted(async () => {

  await fetchData();
  if (typeof window !== 'undefined') {
    const storedTopbar = localStorage.getItem('hideTopbar')
    const storedBanner = localStorage.getItem('hideBanner')

    if (storedTopbar === 'true') hideTopbar.value = true
    if (storedBanner === 'true') hideBanner.value = true
  }
})

watch(hideTopbar, (val) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hideTopbar', val.toString())
  }
})

watch(hideBanner, (val) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hideBanner', val.toString())
  }
})
</script>
<template>
  
    
 
    <!-- Header -->
    <header class="bg-white shadow-md">
      <div class="container mx-auto flex justify-between items-center p-4">
        <h1 class="text-2xl font-bold">
          <img src="https://isc-depot.com/images/logonew1.jpg" class="h-10" alt="ISC Logo">
        </h1>
        <nav class="hidden md:flex space-x-8 text-base font-semibold">
       <button
          @click="currentSection = 'categories'"
          :class="{'text-blue-600 font-bold': currentSection === 'categories'}"
        >
        Categories
      </button>
  <!-- <button @click="currentSection = 'products'" class="hover:text-blue-600">Products</button> -->
  <button @click="currentSection = 'brand'" class="hover:text-blue-600">Brands</button>
  <a href="#contact" class="hover:text-blue-600">Contact</a>
        </nav>
      </div>
    </header>
 
     <hr class="border-t border-gray-200">
    <!-- Topbar -->
    <div v-if="!hideBanner" id="topbar" class="bg-white border-b py-6 px-4 text-sm">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div class="flex flex-wrap items-center space-x-4">
          <span class="font-semibold text-base">Accepted Payments:</span>
          <img src="/public/images/visa.png" class="h-10 md:h-12 p-1 bg-white rounded shadow-sm" alt="Visa">
          <img src="/public/images/mastercard.png" class="h-10 md:h-12 p-1 bg-white rounded shadow-sm" alt="Mastercard">
          <img src="/public/images/cash.png" class="h-10 md:h-12 p-1 bg-white rounded shadow-sm" alt="Cash">
        </div>
        <div class="flex flex-wrap items-center space-x-4">
          <span class="font-semibold text-base">Shipping Methods:</span>
          <img src="/public/images/dhl.png" class="h-10 md:h-12 p-1 bg-white rounded shadow-sm" alt="DHL">
          <img src="/public/images/fedex.png" class="h-10 md:h-12 p-1 bg-white rounded shadow-sm" alt="FedEx">
        </div>
      </div>
      
    </div>


    <!-- <div class="flex items-center space-x-2 justify-start md:justify-end">
        <input type="checkbox" id="hideTopbarCheckbox" v-model="hideTopbar" class="accent-blue-600">
        <label for="hideTopbarCheckbox" class="text-sm text-gray-600 cursor-pointer">Hide this bar next time</label>
      </div> -->

    <!-- Banner -->
    <section v-if="!hideBanner" id="banner" class="bg-cover bg-center h-40 md:h-64" :style="bannerStyle">
      <div class="container mx-auto h-full flex items-center justify-center">
        <h2 class="text-white text-2xl md:text-4xl font-bold bg-black bg-opacity-50 p-2 md:p-4 rounded">
          Your One-Stop Shop for Building Materials
        </h2>
      </div>
     
    </section>

      <div class="flex items-center space-x-2 justify-start md:justify-end px-4 py-2">
        <input type="checkbox" id="hideBannerCheckbox" v-model="hideBanner" class="accent-blue-600">
        <label for="hideBannerCheckbox" class="text-sm text-gray-600 cursor-pointer">Hide banner next time</label>
      </div>

    <main class="container mx-auto p-6">
      <!-- Categories -->
      <section id="categories" v-if="currentSection === 'categories'" class="mb-10">
         <div class="flex justify-between items-center mb-6">
  <h2 class="text-3xl font-bold">Browse Categories</h2>
  <div class="space-x-2">
    <button
      @click="viewMode = 'grid'"
      :class="['px-3 py-1 rounded border', viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600']"
    >
      Grid View
    </button>
    <button
      @click="viewMode = 'list'"
      :class="['px-3 py-1 rounded border', viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600']"
    >
      List View
    </button>
  </div>
</div>
          <!-- Category View -->
<div
  v-if="!selectedDepartment"
  :class="[
    viewMode === 'grid'
      ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
      : 'flex flex-col gap-4'
  ]"
>
  <div
    class="bg-white border rounded-lg p-4 flex flex-col items-center hover:shadow cursor-pointer"
    v-for="department in prodcutsDepartments"
    :key="department.id"
    @click="fetchSubCategories(department.id)"
  >
    <img src="/public/images/power-tools.png" alt="Power Tools" class="w-24 h-24 object-cover rounded-full mb-3">
    <h3 class="text-center font-medium text-sm">{{ department.Product_Department_Name }}</h3>
  </div>
</div>

<!-- Subcategory View -->
<div
  v-else-if="selectedDepartment && !selectedSubCategory"
  class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
>
  <div
    class="bg-blue-50 border rounded-lg p-4 flex flex-col items-center hover:shadow cursor-pointer"
    v-for="sub in subCategories"
    :key="sub.id"
    @click="fetchSubSubCategories(sub.id)"
  >
    <img src="/public/images/power-tools.png" alt="SubCategory" class="w-24 h-24 object-cover rounded-full mb-3">
    <h3 class="text-center font-medium text-sm">{{ sub.name }}</h3>
  </div>
</div>

<!-- Sub-subcategory View -->
<div
  v-else
  class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
>
  <div
    class="bg-green-50 border rounded-lg p-4 flex flex-col items-center hover:shadow cursor-pointer"
    v-for="subSub in subSubCategories"
    :key="subSub.id"
  >
    <img src="/public/images/power-tools.png" alt="SubSubCategory" class="w-24 h-24 object-cover rounded-full mb-3">
    <h3 class="text-center font-medium text-sm">{{ subSub.name }}</h3>
  </div>
</div>

      </section>

      <!-- Products -->
      <!-- <section id="products" v-if="currentSection === 'products'">
        <h2 class="text-3xl font-bold mb-6">Featured Products</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div class="bg-white border rounded-lg overflow-hidden hover:shadow-lg">
            <img src="https://isc-depot.com/uploads/products/724005454.jpg" alt="Product" class="h-48 w-full object-cover">
            <div class="p-4">
              <h3 class="text-lg font-bold">8732 emerson</h3>
              <p class="text-sm text-gray-600">A dual-compartment transmitter housing provides isolation from the external environment...</p>
              <span class="text-blue-600 font-semibold block mt-2">OMR 10.00</span>
            </div>
          </div>
        </div>
      </section> -->

      <!-- Brands -->
      <section id="brand" v-if="currentSection === 'brand'">
        <h2 class="text-3xl font-bold mb-6">Our Brands</h2>
        <div class="flex space-x-6 overflow-x-auto">
          <div class="flex-shrink-0 w-32 h-20 bg-white rounded shadow flex items-center justify-center p-2">
            <img src="/public/images/brand-dewalt.png" alt="DeWalt" class="h-full object-contain">
          </div>
        </div>
      </section>
    </main>

   
 
</template>



<style scoped>
.spinner-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
</style>


