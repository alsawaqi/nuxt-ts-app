<script setup lang="ts">
definePageMeta({
  layout: 'layout',
})
import { ref, watch,onMounted } from 'vue'
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/vue/24/solid'
import { useUserStore } from '~/stores/user'
import { useCartStore } from '~/stores/cart'
const cart = useCartStore()

const { user, isAuthenticated } = useAuth()
const userStore = useUserStore()
 
const { $axios ,$r2Url } = useNuxtApp();


interface ProductDepartment {
  id: number;
  Product_Department_Name: string;
  Image_path: string;
  
}

interface ProductBrand {
  id: number;
  name: string;
  Brands_Image_Path: string;
}


const currentSection = ref<'categories' | 'products' | 'brand'>('categories')
const hideTopbar = ref(false)
const hideBanner = ref(false)
const mobileMenuOpen = ref(false)
const prodcutsDepartments = ref<ProductDepartment[]>([])
const productBrands = ref<ProductBrand[]>([])
const bannerStyle = 'background-image: url(\'https://www.aabtools.com/banner/HomePageBanner/Desktop/Megger_Desktop.webp\')'

const viewMode = ref<'grid' | 'list'>('grid')


const subCategories = ref<any[]>([])
const subSubCategories = ref<any[]>([])

const selectedDepartment = ref<number | null>(null)
const selectedSubCategory = ref<number | null>(null)

const isloadingBrand = ref<boolean>(false);
const isloadingCategories = ref<boolean>(false);



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


function resetToMainCategory() {
  selectedDepartment.value = null
  selectedSubCategory.value = null
  subCategories.value = []
  subSubCategories.value = []
}


const fetchData = async () => {
  isloadingCategories.value = true
  try {
    const response = await $axios.get('/api/productdepartment')
    // Process the response data as needed
    console.log(response.data);
    prodcutsDepartments.value = response.data;
  } catch (error) {
    console.error('Error fetching data:', error)
  }finally {
    isloadingCategories.value = false
  }
}



const fetchSubCategories = async (departmentId: number) => {
   isloadingCategories.value = true 
  try{

     selectedDepartment.value = departmentId
  const response = await $axios.get(`/api/categories/${departmentId}/subcategories`)
  subCategories.value = response.data
  subSubCategories.value = [] // Reset
   }catch(error){
     console.error('Error fetching subcategories:', error)
   }finally{
    isloadingCategories.value = false
   }
 
}

// Fetch sub-subcategories
const fetchSubSubCategories = async (subCategoryId: number) => {

  isloadingCategories.value = true
   try{

    selectedSubCategory.value = subCategoryId
  const response = await $axios.get(`/api/subcategories/${subCategoryId}/subsubcategories`)
  subSubCategories.value = response.data

   }catch(error){
     console.error('Error fetching sub-subcategories:', error)
   }finally{
    isloadingCategories.value = false
   }
  
}



const selectedDepartmentName = computed(() => {
  return prodcutsDepartments.value.find(d => d.id === selectedDepartment.value)?.Product_Department_Name || ''
})

const selectedSubCategoryName = computed(() => {
  return subCategories.value.find(s => s.id === selectedSubCategory.value)?.name || ''
})

const categoryPath = computed(() => {
  let path = 'Browse Categories'
  if (selectedDepartmentName.value) path += ` > ${selectedDepartmentName.value}`
  if (selectedSubCategoryName.value) path += ` > ${selectedSubCategoryName.value}`
  return path
})


function goBack() {
  if (selectedSubCategory.value !== null) {
    // Going back from sub-subcategory to subcategory
    selectedSubCategory.value = null
    subSubCategories.value = []
  } else if (selectedDepartment.value !== null) {
    // Going back from subcategory to main category
    selectedDepartment.value = null
    subCategories.value = []
  }
}

const getBrands = async () => {
  isloadingBrand.value = true
  try {
    const response = await $axios.get('/api/productbrand')
    productBrands.value = response.data
    
  } catch (error) {
    console.error('Error fetching brands:', error)
  }finally {
    isloadingBrand.value = false
  }
}


const logout = async () => {
   await userStore.logout()
}


onMounted(async () => {
  await fetchData();
  await getBrands();
 
  
  if (typeof window !== 'undefined') {
    const storedTopbar = localStorage.getItem('hideTopbar')
    const storedBanner = localStorage.getItem('hideBanner')

    if (storedTopbar === 'true') hideTopbar.value = true
    if (storedBanner === 'true') hideBanner.value = true


  }
})


</script>
<template>
  
  
<header class="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md relative z-50">
  <div class="w-full max-w-screen-xl mx-auto flex justify-between items-center p-4" style="height: 80px;">

    
    <!-- Hamburger button (mobile only) -->
    <button
      class="text-teal-600 md:hidden absolute left-4 text-white"
      @click="mobileMenuOpen = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Logo -->
     <NuxtLink to="/" class="flex items-center">
    <img src="/logonew3.png" alt="ISC Logo" class="h-12 md:h-14 mx-auto md:mx-0 absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none"/>
    </NuxtLink>
 
    <nav class="hidden md:flex space-x-6 text-base font-semibold text-teal-700 ml-auto pr-4 text-white">
      <button
        @click="currentSection = 'categories'"
        :class="{ 'border-b-2 border-white': currentSection === 'categories' }"
        class="hover:text-gray-200 transition"
      >
        Categories
      </button>


      <button
        @click="currentSection = 'brand'"
      :class="{ 'border-b-2 border-white': currentSection === 'brand' }"
        class="hover:text-gray-200 transition"
      >
        Brands
      </button>
      <a href="#contact" class="hover:text-gray-200 transition">Contact</a>


      

      
    </nav>
  

      <h1 class="border-b-2 border-white" v-if="isAuthenticated">Welcome, {{ user?.User_Name ?? 'Guest' }}</h1>

      
    
  </div>

  <!-- Overlay -->
  <div
    v-if="mobileMenuOpen"
    @click="mobileMenuOpen = false"
    class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
  ></div>

  <!-- Mobile Drawer -->
  <div
    class="fixed top-0 left-0 w-64 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden"
    :class="{ '-translate-x-0': mobileMenuOpen, '-translate-x-full': !mobileMenuOpen }"
  >
    <!-- Menu header with gradient -->
    <div class="p-4 flex justify-between items-center border-b bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
      <h3 class="text-lg font-bold">Menu</h3>
      <button @click="mobileMenuOpen = false" class="border border-white px-2 py-1 rounded hover:bg-white hover:text-teal-600">
        Close
      </button>
    </div>

    <!-- Shared nav (mobile view) -->
    <nav class="flex flex-col p-4 space-y-2 text-base font-semibold text-teal-800">
      <button
        @click="currentSection = 'categories'; mobileMenuOpen = false"
        :class="{ 'bg-cyan-100 text-teal-700': currentSection === 'categories' }"
        class="w-full text-left px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50"
      >
        Categories
      </button>
      <button
        @click="currentSection = 'brand'; mobileMenuOpen = false"
        :class="{ 'bg-cyan-100 text-teal-700': currentSection === 'brand' }"
        class="w-full text-left px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50"
      >
        Brands
      </button>
      <a
        href="#contact"
        @click="mobileMenuOpen = false"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 text-left"
      >
        Contact
      </a>


        
      <NuxtLink :to="'/login'" v-if="!isAuthenticated" class="w-full flex items-center justify-between font-semibold py-2 px-3 rounded border border-gray-200 hover:bg-cyan-50">
        Login
      </NuxtLink>
    

 
      <NuxtLink :to="'/register'" v-if="!isAuthenticated" class="w-full flex items-center justify-between font-semibold py-2 px-3 rounded border border-gray-200 hover:bg-cyan-50">
        Register
      </NuxtLink>
       

      
  <NuxtLink v-if="isAuthenticated" :to="`/account`" class="w-full flex items-center justify-between font-semibold py-2 px-3 rounded border border-gray-200 hover:bg-cyan-50">
    My Account
    <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </NuxtLink>

   <button v-if="isAuthenticated"  @click="logout" class="w-full flex items-center justify-between font-semibold py-2 px-3 rounded border border-gray-200 hover:bg-cyan-50">
        Logout
        <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17l5-5m0 0l-5-5m5 5H3" />
        </svg>
  </button>
 
    </nav>
  </div>
</header>
     


<!-- Secondary Nav Bar -->
<section class="text-white" style="background-color: rgb(31 41 55 / var(--tw-bg-opacity, 1));">

  <div class="w-full max-w-screen-xl mx-auto flex items-center gap-4 px-4 py-2">

    

    <!-- Search Input -->
    <div class="flex flex-1 border border-cyan-500 rounded-sm overflow-hidden bg-white">
      <input
        type="text"
        placeholder="Enter keyword, item, model or part #"
        class="w-full px-3 py-1.5 text-gray-700 outline-none"
      />
      <button class="bg-[#b7d406] hover:brightness-90 px-3 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </button>
    </div>

 

    <!-- My Account -->
    <div class="relative hidden md:block" v-if="isAuthenticated">
      <NuxtLink :to="'/account'" class="flex items-center font-semibold hover:text-cyan-300">
        My Account
        <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </NuxtLink>
    </div>


    <div class="relative hidden md:block" v-if="!isAuthenticated">
      <NuxtLink :to="'/login'" class="text-white font-semibold hover:text-cyan-300">
        Login
      </NuxtLink>
   </div>


    <div class="relative hidden md:block" v-if="!isAuthenticated">
      <NuxtLink :to="'/register'" class="text-white font-semibold hover:text-cyan-300">
        Register
      </NuxtLink>
   </div>


     <div class="relative hidden md:block" v-if="isAuthenticated">
      <button @click="logout" class="text-white font-semibold hover:text-cyan-300">
        Logout
      </button>
     </div>

    <!-- Cart Icon -->
    <NuxtLink :to="'/cart'" class="ml-2 hover:text-cyan-300 flex items-center gap-x-1">
          <svg class="cartIcon__N2WMD" aria-hidden="true" width="32px" height="32px" viewBox="0 0 32 32" version="1.1" data-testid="icon-cart-default" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><path d="M22.5005,30.0003 C21.1197881,30.0003 20.0005,28.8810119 20.0005,27.5003 C20.0005,26.1195881 21.1197881,25.0003 22.5005,25.0003 C23.8812119,25.0003 25.0005,26.1195881 25.0005,27.5003 C25.0005,28.8810119 23.8812119,30.0003 22.5005,30.0003 Z M8.5005,30.0003 C7.11978813,30.0003 6.0005,28.8810119 6.0005,27.5003 C6.0005,26.1195881 7.11978813,25.0003 8.5005,25.0003 C9.88121187,25.0003 11.0005,26.1195881 11.0005,27.5003 C11.0005,28.8810119 9.88121187,30.0003 8.5005,30.0003 Z M26.6916031,14.6894404 L27.7778056,9.2433373 L7.3469968,6.27044601 L10.1225142,14.6894404 L26.6916031,14.6894404 Z M29.8952003,7.75739537 C30.006221,7.90850811 30.0152227,8.11603627 29.9852171,8.30039381 L28.396921,16.1814269 C28.3419107,16.5148823 28.0598581,16.7586775 27.7287964,16.7586775 L10.1225142,16.7586775 L8.09113552,21.9307629 L25.6894162,21.9307629 C26.063486,21.9307629 26.3665425,22.2400403 26.3665425,22.6208444 L26.3665425,23.3109259 C26.3665425,23.6927374 26.063486,24 25.6894162,24 L6.0617572,24 C5.85271823,24 5.6556815,23.9022804 5.52765763,23.735049 C5.39963377,23.5678176 5.35462538,23.3502152 5.4046347,23.1447019 L8.36418643,15.7855115 L5.24760543,6.04075465 L4.59748423,4.02894038 L2.67712623,4.02894038 C2.3030565,4.02894038 2,3.71966297 2,3.33885887 L2,2.69008151 C2,2.30927741 2.3030565,2 2.67712623,2 L5.45964496,2 C5.71669288,2 5.95073651,2.1490979 6.06575795,2.3808041 L6.64286553,4.13270446 L28.171879,7.26577525 L28.1728792,7.26073816 L29.4121102,7.44811796 C29.5951444,7.47028116 29.78618,7.60628263 29.8952003,7.75739537 Z" fill="#FFFFFF"></path></g></svg>
            <span class="text-white text-sm font-semibold">
               {{ cart.totalItems() }}
            </span>
        </NuxtLink>
  </div>
</section>

 
     <hr class="border-t border-gray-200">





    <!-- Topbar -->
    <div
  v-if="!hideBanner"
  id="topbar"
  class="bg-gradient-to-r from-lime-400 to-yellow-300 py-4 px-4 text-sm text-gray-800 border-b border-lime-300"
>
  <div class="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
    <div class="flex flex-wrap items-center space-x-4">
      <span class="font-semibold text-base">Accepted Payments:</span>
      <img src="/images/visa.png" class="h-8 md:h-10 p-1 bg-white rounded shadow-sm" alt="Visa" />
      <img src="/images/mastercard.png" class="h-8 md:h-10 p-1 bg-white rounded shadow-sm" alt="Mastercard" />
      <img src="/images/cash.png" class="h-8 md:h-10 p-1 bg-white rounded shadow-sm" alt="Cash" />
    </div>
    <div class="flex flex-wrap items-center space-x-4">
      <span class="font-semibold text-base">Shipping Methods:</span>
      <img src="/images/dhl.png" class="h-8 md:h-10 p-1 bg-white rounded shadow-sm" alt="DHL" />
      <img src="/images/fedex.png" class="h-8 md:h-10 p-1 bg-white rounded shadow-sm" alt="FedEx" />
    </div>
  </div>
    </div>




   
 

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

    <main class="container mx-auto p-6 flex-grow">
      <!-- Categories -->
      <section id="categories" v-if="currentSection === 'categories'" class="mb-10">


         <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-4">
              <!-- Show back button if we're not at root -->
              <button
                v-if="selectedDepartment !== null || selectedSubCategory !== null"
                @click="goBack"
                class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Back
              </button>

              <!-- Dynamic breadcrumb -->
              <h2 class="text-2xl font-bold">{{ categoryPath }}</h2>
            </div>

              <!-- View mode buttons -->
              <div class="space-x-2">
                <button
                  @click="viewMode = 'grid'"
                  :class="[
                    'px-3 py-2 rounded border',
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                  ]"
                >
                  <Squares2X2Icon class="w-5 h-5" />
                </button>
                <button
                  @click="viewMode = 'list'"
                  :class="[
                    'px-3 py-2 rounded border',
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                  ]"
                >
                  <ListBulletIcon class="w-5 h-5" />
                </button>
              </div>
         </div>


          <div class="flex items-center space-x-2 mb-4">
            <!--loading spinner-->
            <div v-if="isloadingBrand" class="spinner-container">
              <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2.93 6.07A8.003 8.003 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3.93-1.868zM12 20a8.003 8.003 0 01-6.07-2.93l-3.93 1.868A11.95 11.95 0 0012 24v-4zm6.07-2.93A8.003 8.003 0 0120 12h4c0 3.042-1.135 5.824-3 7.938l-3.93-1.868zM20 12a8.003 8.003 0 01-2.93-6.07l3.93-1.868A11.95 11.95 0 0024 12h-4z"></path>
              </svg>
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
              class="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center shadow-sm hover:shadow-lg hover:border-blue-400 transition duration-300 ease-in-out cursor-pointer"

              v-for="department in prodcutsDepartments"
              :key="department.id"
              @click="fetchSubCategories(department.id)"
            >
              <img :src="`${$r2Url}/`+ department.Image_path" alt="Power Tools" class="w-24 h-24 object-cover rounded-full mb-3">
              <h3 class="text-center font-medium text-sm">{{ department.Product_Department_Name }}</h3>
            </div>
          </div>

            <!-- Subcategory View -->
            <div
              v-else-if="selectedDepartment && !selectedSubCategory"
               :class="[
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
                : 'flex flex-col gap-4'
            ]"
            >
              <div
                class="bg-blue-50 border rounded-lg p-4 flex flex-col items-center hover:shadow cursor-pointer"
                v-for="sub in subCategories"
                :key="sub.id"
                @click="fetchSubSubCategories(sub.id)"
              >
                <img :src="`${$r2Url}/`+ sub.Image_path" alt="SubCategory" class="w-24 h-24 object-cover rounded-full mb-3">
                <h3 class="text-center font-medium text-sm">{{ sub.Sub_Department_Name }}</h3>
              </div>
            </div>

            <!-- Sub-subcategory View -->
            <div
              v-else
               :class="[
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'flex flex-col gap-4'
              ]"
            >

            
              <div
                class="bg-green-50 border rounded-lg p-4 flex flex-col items-center hover:shadow cursor-pointer"
                v-for="subSub in subSubCategories"
                :key="subSub.id"
              >

              <NuxtLink :to="`/departments/${subSub.Slug}`">



            
                <img :src="`${$r2Url}/`+ subSub.Image_Path"alt="SubSubCategory" class="w-24 h-24 object-cover rounded-full mb-3">
                <h3 class="text-center font-medium text-sm">{{ subSub.Product_Sub_Sub_Department_Name }}</h3>

                </NuxtLink>
              </div>


            </div>

      </section>

     

      <!-- Brands -->
      <section id="brand" v-if="currentSection === 'brand'">
        <h2 class="text-3xl font-bold mb-6">Our Brands</h2>
         
       
        <div class="flex space-x-6 overflow-x-auto">

          <div v-for="brand in productBrands" class="flex-shrink-0 w-32 h-20 bg-white rounded shadow flex items-center justify-center p-2" >
            <img :src="`${$r2Url}/`+ brand.Brands_Image_Path" alt="DeWalt" class="h-full object-contain">
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


