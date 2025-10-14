<script setup lang="ts">
definePageMeta({
  layout: 'layout',
})
import { ref, watch, onMounted, computed  } from 'vue'
import SearchAutocomplete from '~/components/SearchAutocomplete.vue'
import { Squares2X2Icon, ListBulletIcon, ChartPieIcon,ShoppingBagIcon,CreditCardIcon } from '@heroicons/vue/24/solid'
import { useUserStore } from '~/stores/user'
import { useCartStore } from '~/stores/cart'
 
const cart = useCartStore()


const router = useRouter()
const route  = useRoute()
const points = ref<any>('')
const { user, isAuthenticated } = useAuth()
const userStore = useUserStore()
 
const { $axios ,$r2Url } = useNuxtApp();

type Section = 'categories' | 'products' | 'brand'



 
function gotoProduct(item: any) {
  // Prefer slug route if you have it
  if (item.Slug) {
    router.push(`/product/${item.Slug}`)
  } else {
    // fallback by id
    router.push(`/product/id/${item.id}`)
  }
}


 const getloyalitypoints = async () => { 
      
      try { 
        const response = await $axios.get('/api/loyalty', { withCredentials: true }) 
        
        points.value = response.data
      } catch(e){

      }finally { 
       
      } 
    }



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

const viewMode = ref<'grid' | 'list' |'pie'>('grid')


const subCategories = ref<any[]>([])
const subSubCategories = ref<any[]>([])

const selectedDepartment = ref<number | null>(null)
const selectedSubCategory = ref<number | null>(null)

const isloadingBrand = ref<boolean>(false);
const isloadingCategories = ref<boolean>(false);




function setSectionFromQuery() {
  const sec = (route.query.section as string) || 'categories'
  currentSection.value =
    sec === 'categories' || sec === 'products' || sec === 'brand' ? (sec as Section) : 'categories'

  if (currentSection.value === 'categories' && !route.query.deptId && !route.query.subId) {
    resetToMainCategory()
  }
}

watch(() => route.query.section, setSectionFromQuery, { immediate: true })



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


 

async function restoreFromQuery() {

   setSectionFromQuery() // <— add this
   
  const deptId = route.query.deptId ? Number(route.query.deptId) : null
  const subId  = route.query.subId  ? Number(route.query.subId)  : null

  if (deptId) {
    await fetchSubCategories(deptId)
  }
  if (subId) {
    await fetchSubSubCategories(subId)
  }
}

/** Pick the items to render based on where you are in the tree */
 
const pieItems = computed(() => {
  if (!selectedDepartment.value) return prodcutsDepartments.value ?? []
  if (selectedDepartment.value && !selectedSubCategory.value) return subCategories.value ?? []
  return subSubCategories.value ?? []
})

const getItemName = (it: any) => {
  if (!selectedDepartment.value) return it.Product_Department_Name
  if (selectedDepartment.value && !selectedSubCategory.value) return it.Sub_Department_Name
  return it.Product_Sub_Sub_Department_Name
}
const getItemImage = (it: any) => {
  if (!selectedDepartment) return it.Image_path
  if (selectedDepartment && !selectedSubCategory) return it.Image_path
  return it.Image_Path
}

/** Click behavior by level */
 


const centerLabel = computed(() => {
  const i = hovered.value
  if (i != null) return getItemName(pieItems.value[i])
  if (!selectedDepartment.value) return 'Departments'
  if (selectedDepartment.value && !selectedSubCategory.value) return 'Subcategories'
  return 'Browse'
})

const onSliceClick = (it: any) => {
  if (!selectedDepartment.value) return fetchSubCategories(it.id)
  if (selectedDepartment.value && !selectedSubCategory.value) return fetchSubSubCategories(it.id)
  if (it.Slug) router.push(`/departments/${it.Slug}`)
}

/** Donut math */
const hovered = ref<number|null>(null)
const palette = ['#10b981','#3b82f6','#a855f7','#06b6d4','#f59e0b','#ef4444','#14b8a6','#8b5cf6','#22c55e','#f97316']

const polarToCartesian = (cx:number, cy:number, r:number, angle:number) => {
  const rad = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
const arcPath = (cx:number, cy:number, rOuter:number, rInner:number, start:number, end:number) => {
  const largeArc = end - start <= 180 ? 0 : 1
  const sO = polarToCartesian(cx, cy, rOuter, start)
  const eO = polarToCartesian(cx, cy, rOuter, end)
  const sI = polarToCartesian(cx, cy, rInner, end)
  const eI = polarToCartesian(cx, cy, rInner, start)
  return [
    `M ${sO.x} ${sO.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${eO.x} ${eO.y}`,
    `L ${sI.x} ${sI.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${eI.x} ${eI.y}`,
    'Z'
  ].join(' ')
}

const slices = computed(() => {
  const items = pieItems.value
  const n = Math.max(items.length, 1)
  const step = 360 / n
  const cx = 100, cy = 100, rOuter = 92, rInner = 36
  return items.map((it: any, i: number) => {
    const start = i * step
    const end = start + step
    return {
      item: it,
      d: arcPath(cx, cy, rOuter, rInner, start, end),
      color: palette[i % palette.length],
    }
  })
})

/** Center label text */
 
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
  return subCategories.value.find(s => s.id === selectedSubCategory.value)?.Sub_Department_Name || ''
})





const categoryPath = computed(() => {
  let path = ''
  if (selectedDepartmentName.value) path += ` ${selectedDepartmentName.value}`
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
  await restoreFromQuery()
  //await getloyalitypoints ()
  if (typeof window !== 'undefined') {
    const storedTopbar = localStorage.getItem('hideTopbar')
    const storedBanner = localStorage.getItem('hideBanner')

    if (storedTopbar === 'true') hideTopbar.value = true
    if (storedBanner === 'true') hideBanner.value = true


  }
})


</script>
<template>
  
 <!-- ===== Responsive Header (XS → 4K) ===== -->
<header class="sticky top-0 z-50 bg-white">

  <!-- Top slim bar -->
  <div class="hidden sm:block bg-slate-50 text-[12px] sm:text-[13px] text-slate-600">
    <div class="max-w-screen-2xl mx-auto h-9 sm:h-10 px-3 sm:px-5 flex items-center justify-between">
      <div class="flex items-center gap-4 sm:gap-6">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="font-medium text-slate-700 hidden md:inline">Payments</span>
          <img src="/images/visa.png" class="h-3.5 sm:h-4" alt="Visa" loading="lazy" decoding="async" />
          <img src="/images/mastercard.png" class="h-3.5 sm:h-4" alt="Mastercard" loading="lazy" decoding="async" />
          <img src="/images/cash.png" class="h-3.5 sm:h-4" alt="Cash" loading="lazy" decoding="async" />
        </div>
        <div class="hidden sm:flex items-center gap-2 sm:gap-3">
          <span class="font-medium text-slate-700 hidden md:inline">Shipping</span>
          <img src="/images/dhl.png" class="h-3.5 sm:h-4" alt="DHL" loading="lazy" decoding="async" />
          <img src="/images/fedex.png" class="h-3.5 sm:h-4" alt="FedEx" loading="lazy" decoding="async" />
        </div>
      </div>

      <span class="text-slate-500 truncate max-w-[50%] sm:max-w-none" v-if="isAuthenticated">
        Welcome, {{ user?.User_Name}}  <span v-if="isAuthenticated">🎖</span><span class="text-sm font-medium">{{ points }} points </span>
      </span>

      
    </div>
  </div>

  <!-- Main row -->
  <div class="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6">
    <!-- md: optimized to prevent collisions -->
    <div class="grid grid-cols-[auto,1fr,auto] md:grid-cols-[1fr,auto,1fr] items-center
                gap-2 sm:gap-3 md:gap-3 lg:gap-5 py-2.5 sm:py-3 md:py-3.5 lg:py-4">

      <!-- Left: Nav / Hamburger -->
      <div class="flex items-center">
        <!-- Mobile hamburger -->
        <button class="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                @click="mobileMenuOpen = true" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        <!-- Desktop nav (tighter at md, roomy at lg) -->
        <nav class="hidden md:flex items-center gap-5 lg:gap-8 text-[14px] md:text-[15px] lg:text-[17px] font-semibold text-slate-700">
          <NuxtLink to="/" class="pb-1 border-b-2"
            :class="$route.path==='/' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
            Home
          </NuxtLink>
          <button @click="currentSection='categories'" class="pb-1 border-b-2"
            :class="currentSection==='categories' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
            Shops
          </button>
          <button @click="currentSection='brand'" class="pb-1 border-b-2"
            :class="currentSection==='brand' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
            Brands
          </button>
          <NuxtLink to="#" class="pb-1 border-b-2"
            :class="$route.path.startsWith('/dealerships') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
            Dealerships
          </NuxtLink>
          <NuxtLink to="/contact" class="pb-1 border-b-2"
            :class="$route.path.startsWith('/contact') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
            Contact
          </NuxtLink>
        </nav>
      </div>

      <!-- Center: Logo + name (scale down at md, big at lg) -->
      <div class="justify-self-center flex flex-col items-center min-w-0">
        <NuxtLink to="/" class="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-4"
          @click="mobileMenuOpen=false">
        <img
          src="/logonew1.jpg"
          alt="ISC"
          class="h-10 w-auto object-contain sm:h-12 md:h-12 lg:h-16"
        />
        </NuxtLink>
        <span class="mt-1.5 sm:mt-2 text-[14px] sm:text-[15px] md:text-[15px] lg:text-[17px] font-semibold text-slate-800 text-center truncate">
          Industrial Supplies Center LLC
        </span>
      </div>

      <!-- Right: Cart + Checkout + Account -->
      <div class="justify-self-end flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-5">
        <!-- Cart (compact at md, larger at lg) -->
        <NuxtLink
              to="/cart"
              class="relative inline-flex items-center justify-center rounded-full p-1.5 md:p-2
                    ring-1 ring-slate-200 bg-white/90 hover:bg-white transition
                    hover:shadow-sm hover:ring-slate-300 focus:outline-none focus-visible:ring-2
                    focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1 text-slate-700"
              aria-label="Open cart"
              title="Cart"
            >
              <!-- count badge -->
              <span
                v-if="cart.totalItems()"
                class="pointer-events-none absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                      text-[10px] leading-[18px] text-white font-semibold grid place-items-center
                      rounded-full shadow-sm ring-1 ring-white
                      bg-gradient-to-br from-[#2F5FB6] to-[#07B6C6]"
              >
                {{ cart.totalItems() }}
              </span>

  <!-- icon -->
  <ShoppingBagIcon class="w-5 h-5 md:w-5 md:h-5" aria-hidden="true" />
        </NuxtLink>

  <!-- Compact mobile checkout -->
<NuxtLink
  v-if="isAuthenticated"
  to="/cart/checkout"
  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full 
         bg-gradient-to-r from-[#2F5FB6] to-[#07B6C6] text-white 
         hover:opacity-90 shadow-sm text-[12px] font-medium 
         md:hidden transition"
>
  <CreditCardIcon class="w-4 h-4" aria-hidden="true" />
 
</NuxtLink>

<!-- Tablet + Desktop checkout -->
<NuxtLink
  v-if="isAuthenticated"
  to="/cart/checkout"
  class="hidden md:inline-flex items-center gap-2 px-3.5 lg:px-4 
         py-1.5 lg:py-2 rounded-full bg-gradient-to-r from-[#2F5FB6] to-[#07B6C6]
         text-white hover:opacity-90 shadow-sm text-[13px] lg:text-[14px] 
         font-semibold transition"
>
  <CreditCardIcon class="w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
  <span>Checkout</span>
</NuxtLink>



        <!-- Account / Auth (HIDE at md to save width, show at lg) -->
        <div class="hidden lg:flex items-center gap-3 text-[15px]">
          <NuxtLink v-if="isAuthenticated" to="/account"
              class="px-3 py-1.5 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#07B6C6]"
    >
            My Account
          </NuxtLink>
          <button v-if="isAuthenticated" @click="logout"
             class="px-3 py-1.5 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2f5fb6]">
            Logout
          </button>
          <template v-if="!isAuthenticated">
            <NuxtLink to="/login"   class="px-3 py-1.5 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#07B6C6]">Login</NuxtLink>
            <NuxtLink to="/register" class="px-3 py-1.5 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2f5fb6]">Register</NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Blue divider -->
  <div class="h-1.5 sm:h-2 bg-[#2f5fb6]"></div>

  <!-- Search bar -->
  <div class="bg-white">
     <div class="max-w-[900px] w-full mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
    <SearchAutocomplete
      :min-chars="2"
      :limit="10"
      placeholder="Search by keyword, item, model or part #"
      @select="gotoProduct"
    />
  </div>
  </div>

  <hr/>

  <!-- Mobile overlay & drawer -->
  <div v-if="mobileMenuOpen" @click="mobileMenuOpen=false" class="fixed inset-0 bg-black/40 z-40 md:hidden"></div>
  <div class="fixed top-0 left-0 w-[84%] max-w-80 h-full bg-white z-50 shadow-2xl transform transition-transform duration-300 md:hidden"
       :class="mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'">
    <div class="p-3 sm:p-4 flex justify-between items-center border-b">
      <NuxtLink to="/" class="flex items-center gap-2" @click="mobileMenuOpen=false">
        <img src="/logonew1.jpg" alt="ISC" class="h-7 sm:h-8 w-auto rounded ring-1 ring-black/10" />
        <span class="font-semibold">ISC</span>
      </NuxtLink>
      <button @click="mobileMenuOpen=false" class="px-2 py-1 rounded border hover:bg-slate-50">Close</button>
    </div>

    <nav class="flex flex-col p-3 sm:p-4 text-slate-800 text-base font-medium space-y-1">
      <NuxtLink to="/" @click="mobileMenuOpen=false" class="px-3 py-2 rounded hover:bg-slate-50">Home</NuxtLink>
      <button @click="currentSection='categories'; mobileMenuOpen=false" class="text-left px-3 py-2 rounded hover:bg-slate-50">Shops</button>
      <button @click="currentSection='brand'; mobileMenuOpen=false" class="text-left px-3 py-2 rounded hover:bg-slate-50">Brands</button>
      <NuxtLink to="#" @click="mobileMenuOpen=false" class="px-3 py-2 rounded hover:bg-slate-50">Dealerships</NuxtLink>
      <NuxtLink to="/contact" @click="mobileMenuOpen=false" class="px-3 py-2 rounded hover:bg-slate-50">Contact</NuxtLink>
      <div class="h-px my-2 bg-slate-200"></div>
      <template v-if="!isAuthenticated">
        <NuxtLink to="/login" @click="mobileMenuOpen=false"  class="px-3 py-2 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95]
           focus:outline-none focus:ring-2 focus:ring-[#07B6C6]">Login</NuxtLink>
        <NuxtLink to="/register" @click="mobileMenuOpen=false"   class="px-3 py-2 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6]
           focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]">Register</NuxtLink>
      </template>
      <template v-else>
        <NuxtLink to="/account" @click="mobileMenuOpen=false" class="px-3 py-2 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95]
           focus:outline-none focus:ring-2 focus:ring-[#07B6C6]">My Account</NuxtLink>
        <button v-if="isAuthenticated" 
                  @click="logout" 
                  mobileMenuOpen="false" 
                   class="text-left px-3 py-2 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6]
           focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]"
                  >
                  Logout
        </button>
      </template>
    </nav>
  </div>
</header>








<!-- Industrial Hero Banner -->
 <!-- Industrial Hero Banner -->
<section v-if="!hideBanner" class="relative isolate overflow-hidden bg-slate-900">
  <!-- Background image -->
  <picture>
    <source type="image/webp" sizes="(min-width: 1024px) 1200px, 100vw" />
    <source type="image/jpeg" sizes="(min-width: 1024px) 1200px, 100vw" />
    <img
      src="https://www.aabtools.com/banner/HomePageBanner/Desktop/Megger_Desktop.webp"
      alt="Industrial supply aisle with power tools, fasteners, and safety gear"
      class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover hero-img"
      loading="eager"
      decoding="async"
    />
  </picture>

  <!-- Readability overlay -->
  <div aria-hidden="true"
       class="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/45 to-transparent"></div>

  <!-- Brand accent wash (subtle + gently drifting) -->
  <div aria-hidden="true"
       class="absolute inset-0 hero-wash
              [mask-image:radial-gradient(80%_60% at 20%_40%,black,transparent)]
              bg-[linear-gradient(to_right,#c2ff4a33,#22d3ee33_35%,transparent_70%)]">
  </div>

  <!-- Content -->
  <div class="absolute inset-0 flex items-center">
    <div class="max-w-screen-xl mx-auto px-4">
      <transition appear name="fade-up">
        <h1 class="text-white text-2xl md:text-3xl font-bold" key="hero-title">
          Industrial Supplies &amp; MRO
        </h1>
      </transition>
      <transition appear name="fade-up" >
        <p class="text-white/85 mt-1 text-sm md:text-base" key="hero-sub" style="transition-delay:120ms">
          Power tools, fasteners, abrasives, safety—trusted brands, fast shipping.
        </p>
      </transition>
    </div>
  </div>
</section>



      <div class="flex items-center space-x-2 justify-start md:justify-end px-4 py-2">
        <input type="checkbox" id="hideBannerCheckbox" v-model="hideBanner" class="accent-blue-600">
        <label for="hideBannerCheckbox" class="text-sm text-gray-600 cursor-pointer">{{!hideBanner ? 'Hide Advertisement Banner' : 'Show Advertisements'}}</label>
      </div>

    <main class="container mx-auto p-6 flex-grow">
      <!-- Categories -->
      <section id="categories" v-if="currentSection === 'categories'" class="mb-10">


         <!-- Header -->
          <div class="flex items-center justify-between mb-3 sm:mb-6">
            <!-- Left: Back + breadcrumb -->
            <div class="flex items-center gap-2 sm:gap-3">
                <!-- Back button (tiny) -->
            <button
              v-if="selectedDepartment !== null || selectedSubCategory !== null"
              @click="goBack"
              class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] sm:text-xs
                    bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:shadow-sm
                    transition-all duration-150 active:scale-[0.98] focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Go back"
            >
              <span class="text-slate-600 leading-none">←</span>
              <span class="text-slate-700 font-medium leading-none">Back</span>
            </button>

            <!-- Breadcrumb -->
            <nav aria-label="Breadcrumb" class="mb-0">
              <ol class="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-sm text-slate-600">
               
  
                <li class="text-slate-400" v-if="categoryPath">›</li>
                <li class="text-slate-900 font-semibold truncate max-w-[55vw] sm:max-w-none">
                  {{ categoryPath }}
                </li>
              </ol>
            </nav>
            </div>

            <!-- Right: view mode (segmented control, compact) -->
            <div class="inline-flex items-center rounded-xl ring-1 ring-slate-300 bg-white p-1 overflow-hidden">
              <button
                @click="viewMode = 'grid'"
                :aria-pressed="viewMode==='grid'"
                :class="[
                  'h-8 w-8 md:h-10 md:w-10 rounded-lg grid place-items-center transition',
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <Squares2X2Icon class="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <button
                @click="viewMode = 'list'"
                :aria-pressed="viewMode==='list'"
                :class="[
                  'h-8 w-8 md:h-10 md:w-10 rounded-lg grid place-items-center transition',
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <ListBulletIcon class="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <button
                @click="viewMode = 'pie'"
                :aria-pressed="viewMode==='pie'"
                :class="[
                  'h-8 w-8 md:h-10 md:w-10 rounded-lg grid place-items-center transition',
                  viewMode === 'pie'
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                ]"
              >
                <ChartPieIcon class="w-4 h-4 md:w-5 md:h-5" />
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





      



                  <div v-if="viewMode === 'pie'" class="w-full">
                      <div class="flex flex-col md:flex-row items-center gap-6">
                        <div class="w-full md:w-auto">
                          <svg viewBox="0 0 200 200" class="w-full max-w-[420px] mx-auto">
                            <g v-for="(s, i) in slices" :key="i">
                              <path
                                :d="s.d"
                                :fill="s.color"
                                class="transition duration-200"
                                :opacity="hovered === null || hovered === i ? 1 : 0.6"
                                @mouseenter="hovered = i"
                                @mouseleave="hovered = null"
                                @click="onSliceClick(s.item)"
                                style="cursor:pointer"
                              />
                              <path :d="s.d" fill="none" stroke="white" stroke-width="0.8" />
                            </g>
                            <circle cx="100" cy="100" r="34" fill="white" stroke="#e5e7eb" stroke-width="1" />
                            <text x="100" y="100" text-anchor="middle" dominant-baseline="middle"
                                  class="fill-slate-700" style="font-size:12px;font-weight:600;">
                              {{ centerLabel }}
                            </text>
                          </svg>
                        </div>
                        </div>
                 </div>


                 <!-- Category View -->
                <div v-else-if="!selectedDepartment">
                  <!-- Grid Mode: Premium card layout -->
                    <div v-if="viewMode === 'grid'">
                      <TransitionGroup
                        name="cat"
                        tag="div"
                        class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                      >
                        <button
                          v-for="department in prodcutsDepartments"
                          :key="department.id"
                          @click="fetchSubCategories(department.id)"
                          :aria-label="department.Product_Department_Name"
                          class="group relative text-left rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
                                hover:shadow-md hover:ring-slate-300 transition-all duration-200 focus:outline-none
                                focus-visible:ring-2 focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1"
                        >
                          <div class="p-4">
                            <!-- Image area -->
                            <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                                        ring-1 ring-slate-100 overflow-hidden">
                              <img
                                :src="`${$r2Url}/` + department.Image_path"
                                alt=""
                                class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                                      group-hover:scale-[1.03]"
                              />
                            </div>

                            <!-- Title -->
                            <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
                              {{ department.Product_Department_Name }}
                            </h3>
                          </div>

                          <!-- Hover underline accent -->
                          <span class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r
                                      from-[#2F5FB6] via-[#07B6C6] to-[#2F5FB6] opacity-0
                                      group-hover:opacity-100 transition-opacity"></span>
                        </button>
                      </TransitionGroup>
                    </div>


                  <!-- List Mode -->
                  <div v-else class="flex flex-col divide-y divide-gray-200 bg-white rounded-md ring-1 ring-gray-300">
                    <div
                      v-for="department in prodcutsDepartments"
                      :key="department.id"
                      @click="fetchSubCategories(department.id)"
                      class="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
                    >
                      <img :src="`${$r2Url}/` + department.Image_path" alt="" class="h-16 w-16 object-contain" />
                      <span class="text-base font-medium text-gray-800">{{ department.Product_Department_Name }}</span>
                    </div>
                  </div>
                </div>

                     <!-- Subcategory View -->
                    <div v-else-if="selectedDepartment && !selectedSubCategory">

                      <!-- GRID mode -->
                       <div v-if="viewMode === 'grid'" class="">
  <div class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    <button
      v-for="sub in subCategories"
      :key="sub.id"
      @click="fetchSubSubCategories(sub.id)"
      :aria-label="sub.Sub_Department_Name"
      class="group relative text-left rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
             hover:shadow-md hover:ring-slate-300 transition-all duration-200 focus:outline-none
             focus-visible:ring-2 focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1"
    >
      <div class="p-4">
        <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                    ring-1 ring-slate-100 overflow-hidden">
          <img
            :src="`${$r2Url}/` + sub.Image_path"
            alt=""
            class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                   group-hover:scale-[1.03]"
          />
        </div>

        <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
          {{ sub.Sub_Department_Name }}
        </h3>
      </div>

      <span class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r
                   from-[#2F5FB6] via-[#07B6C6] to-[#2F5FB6] opacity-0
                   group-hover:opacity-100 transition-opacity"></span>
    </button>
  </div>
</div>


                      <!-- LIST mode -->
                      <div v-else class="flex flex-col divide-y divide-gray-200 bg-white rounded-md ring-1 ring-gray-300">
                        <button
                          v-for="sub in subCategories"
                          :key="sub.id"
                          @click="fetchSubSubCategories(sub.id)"
                          class="flex items-center gap-4 p-4 text-left hover:bg-gray-50"
                        >
                          <img :src="`${$r2Url}/` + sub.Image_path" alt="" class="h-16 w-16 object-contain" />
                          <span class="text-base font-medium text-gray-800">{{ sub.Sub_Department_Name }}</span>
                        </button>
                      </div>

                    </div>


                        <!-- Sub-subcategory View -->
                        <div v-else>

                          <!-- GRID mode -->
                          <div v-if="viewMode === 'grid'">
  <div class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    <NuxtLink
      v-for="subSub in subSubCategories"
      :key="subSub.id"
      :to="{
        path: `/departments/${subSub.Slug}`,
        query: {
          deptId: selectedDepartment ?? undefined,
          subId: selectedSubCategory ?? undefined,
          subSubId: subSub.id
        }
      }"
      :aria-label="subSub.Product_Sub_Sub_Department_Name"
      class="group relative rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
             hover:shadow-md hover:ring-slate-300 transition-all duration-200"
    >
      <div class="p-4">
        <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                    ring-1 ring-slate-100 overflow-hidden">
          <img
            :src="`${$r2Url}/` + subSub.Image_Path"
            alt=""
            class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                   group-hover:scale-[1.03]"
          />
        </div>

        <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
          {{ subSub.Product_Sub_Sub_Department_Name }}
        </h3>
      </div>

      <span class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r
                   from-[#2F5FB6] via-[#07B6C6] to-[#2F5FB6] opacity-0
                   group-hover:opacity-100 transition-opacity"></span>
    </NuxtLink>
  </div>
</div>


                          <!-- LIST mode -->
                          <div v-else class="flex flex-col divide-y divide-gray-200 bg-white rounded-md ring-1 ring-gray-300">
                            <NuxtLink
                              v-for="subSub in subSubCategories"
                              :key="subSub.id"
                              :to="{
                                path: `/departments/${subSub.Slug}`,
                                query: {
                                  deptId: selectedDepartment ?? undefined,
                                  subId: selectedSubCategory ?? undefined,
                                  subSubId: subSub.id
                                }
                              }"
                              class="flex items-center gap-4 p-4 hover:bg-gray-50"
                            >
                              <img :src="`${$r2Url}/` + subSub.Image_Path" alt="" class="h-16 w-16 object-contain" />
                              <span class="text-base font-medium text-gray-800">
                                {{ subSub.Product_Sub_Sub_Department_Name }}
                              </span>
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


/* Subtle zoom/fade on the hero image */
.hero-img {
  animation: heroFade 700ms ease-out both, heroKen 22s ease-out both;
  will-change: transform, opacity;
}

/* Very gentle drift on the brand wash overlay */
.hero-wash {
  background-size: 200% 100%;
  animation: washDrift 28s linear infinite;
  will-change: background-position;
}

/* Vue transition: fade-up on appear */
.fade-up-enter-active,
.fade-up-appear-active {
  transition: opacity 600ms cubic-bezier(.22,.61,.36,1),
              transform 600ms cubic-bezier(.22,.61,.36,1);
}
.fade-up-enter-from,
.fade-up-appear-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-up-enter-to,
.fade-up-appear-to {
  opacity: 1;
  transform: translateY(0);
}

/* Keyframes */
@keyframes heroFade {
  from { opacity: 0; transform: scale(1.02); }
  to   { opacity: 1; transform: scale(1.06); }
}
@keyframes heroKen {
  from { transform: scale(1.06); }
  to   { transform: scale(1.10); }
}
@keyframes washDrift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hero-img,
  .hero-wash {
    animation: none !important;
  }
  .fade-up-enter-active,
  .fade-up-appear-active {
    transition: none !important;
  }
}


/* Smooth entrance for grid items */
.cat-enter-active,
.cat-leave-active { transition: all .18s ease; }
.cat-enter-from,
.cat-leave-to { opacity: 0; transform: translateY(6px) scale(.98); }

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .cat-enter-active,
  .cat-leave-active { transition: none !important; }
}
</style>


