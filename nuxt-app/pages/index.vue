<script setup lang="ts">
definePageMeta({
  layout: 'layout',
})
import { ref, watch, onMounted, computed  } from 'vue'
import { Squares2X2Icon, ListBulletIcon, ChartPieIcon } from '@heroicons/vue/24/solid'
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

const viewMode = ref<'grid' | 'list' |'pie'>('grid')


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


const router = useRouter()

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
  
  
 <header class="sticky top-0 z-50 bg-[#0f766e] shadow-lg">
  <div class="max-w-[1400px] mx-auto h-24 grid grid-cols-[auto,1fr,auto] items-center px-6 md:px-8">

    <!-- Mobile hamburger -->
    <button
      class="md:hidden mr-3 text-white"
      @click="mobileMenuOpen = true"
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Logo -->
    <NuxtLink to="/" class="inline-flex items-center gap-4">
      <span class="inline-flex items-center justify-center bg-white rounded-full px-3.5 py-1.5 shadow ring-1 ring-black/10">
        <img
          src="/logonew1.jpg"
          alt="ISC"
          class="h-12 md:h-14 object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
      <!-- Tagline (hide on small if you want) -->
      <span class="hidden xl:inline-block text-white/95 font-semibold tracking-wide text-lg">
        Industrial Supplies Center LLC
      </span>
    </NuxtLink>

    <!-- Desktop nav -->
    <nav class="hidden md:flex items-center justify-center text-white font-semibold gap-8 lg:gap-12">
      <NuxtLink
        to="/"
        class="pb-1 transition hover:opacity-90 border-b-2"
        :class="$route.path==='/' ? 'border-white/90' : 'border-transparent'"
      >
        Home
      </NuxtLink>

      <button
        @click="currentSection = 'categories'"
        class="pb-1 border-b-2 transition hover:opacity-90"
        :class="currentSection==='categories' ? 'border-white/90' : 'border-transparent'"
      >
        Categories
      </button>

      <button
        @click="currentSection = 'brand'"
        class="pb-1 border-b-2 transition hover:opacity-90"
        :class="currentSection==='brand' ? 'border-white/90' : 'border-transparent'"
      >
        Brands
      </button>

      <NuxtLink
        to="/"
        class="pb-1 border-b-2 transition hover:opacity-90"
        :class="$route.path.startsWith('/dealerships') ? 'border-white/90' : 'border-transparent'"
      >
        Dealerships
      </NuxtLink>

      <NuxtLink to="/contact" class="pb-1 border-b-2 border-transparent transition hover:opacity-90">
        Contact
      </NuxtLink>
    </nav>

    <!-- Welcome pill -->
    <div class="hidden md:flex justify-end">
      <span
        v-if="isAuthenticated"
        class="text-sm font-medium px-4 py-2 rounded-full bg-white/10 ring-1 ring-white/25 text-white"
      >
        Welcome, {{ user?.User_Name ?? 'Guest' }}
      </span>
    </div>
  </div>

  <!-- Mobile overlay -->
  <div
    v-if="mobileMenuOpen"
    @click="mobileMenuOpen = false"
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
  ></div>

  <!-- Mobile drawer -->
  <div
    class="fixed top-0 left-0 w-72 h-full bg-white z-50 shadow-2xl transform transition-transform duration-300 md:hidden"
    :class="mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="p-4 flex justify-between items-center bg-[#0f766e] text-white">
      <h3 class="text-lg font-bold">Menu</h3>
      <button
        @click="mobileMenuOpen = false"
        class="border border-white/70 px-2 py-1 rounded hover:bg-white hover:text-[#0f766e] transition"
        aria-label="Close menu"
      >
        Close
      </button>
    </div>

    <nav class="flex flex-col p-4 space-y-2 text-base font-semibold text-teal-900">
      <NuxtLink
        to="/"
        @click="mobileMenuOpen = false"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Home
      </NuxtLink>

      <button
        @click="currentSection = 'categories'; mobileMenuOpen = false"
        class="w-full text-left px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Categories
      </button>

      <button
        @click="currentSection = 'brand'; mobileMenuOpen = false"
        class="w-full text-left px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Brands
      </button>

      <NuxtLink
        to="/dealerships"
        @click="mobileMenuOpen = false"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Dealerships
      </NuxtLink>

      <NuxtLink to="/contact"
        @click="mobileMenuOpen = false"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Contact
      </NuxtLink>

      <NuxtLink
        v-if="!isAuthenticated"
        to="/login"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Login
      </NuxtLink>

      <NuxtLink
        v-if="!isAuthenticated"
        to="/register"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition"
      >
        Register
      </NuxtLink>

      <NuxtLink
        v-if="isAuthenticated"
        :to="`/account`"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition flex items-center justify-between"
      >
        My Account
        <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </NuxtLink>

      <button
        v-if="isAuthenticated"
        @click="logout"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-teal-50 transition flex items-center justify-between"
      >
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

    <NuxtLink
  to="/cart/checkout"
  class="ml-2 flex items-center gap-x-1 text-white hover:text-cyan-300 transition"
  v-if="isAuthenticated"
>
  <svg
    width="32px"
    height="32px"
    version="1.1"
    viewBox="0 0 1200 1200"
    xmlns="http://www.w3.org/2000/svg"
    class="fill-current"
  >
    <path d="m1e3 1e3c0 55.227-44.773 100-100 100s-100-44.773-100-100 44.773-100 100-100 100 44.773 100 100z"/>
    <path d="m450 1e3c0 55.227-44.773 100-100 100s-100-44.773-100-100 44.773-100 100-100 100 44.773 100 100z"/>
    <path transform="scale(50)" d="m20 16h-13c-0.8 0-1.3-0.9-0.8-1.6l1.8-2.4-3-9h-3" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="2"/>
    <path d="m1050 200h-780l130 450h495c20 0 40-10 45-30l155-350c15-35-10-70-45-70zm-350 350v-100h-200v-50h200v-100l150 125z" />
  </svg>
  Checkout
</NuxtLink>


  </div>
</section>

 
 
    <!-- Topbar -->
    <div
        v-if="!hideBanner"
        id="topbar"
        class="relative isolate  bg-gradient-to-r from-[#c2ff4a] via-[#6fd114] to-[#0a0a0a] text-slate-800"
      >
        <!-- subtle top hairline -->
        <div class="absolute inset-x-0 -top-px h-px bg-white/40"></div>

          <div class="max-w-screen-xl mx-auto px-4">
            <div class="flex items-center gap-4 py-3 overflow-x-auto whitespace-nowrap">
  <!-- Payments -->
  <div class="flex items-center gap-3 shrink-0">
    <span class="text-sm font-semibold uppercase tracking-wide text-slate-700/80">Payments</span>
    <ul class="flex items-center gap-2">
      <li class="shrink-0">
        <img src="/images/visa.png" alt="Visa"
             class="h-7 w-auto rounded-md bg-white/90 p-1.5 ring-1 ring-black/5 shadow-sm"
             loading="lazy" decoding="async" />
      </li>
      <li class="shrink-0">
        <img src="/images/mastercard.png" alt="Mastercard"
             class="h-7 w-auto rounded-md bg-white/90 p-1.5 ring-1 ring-black/5 shadow-sm"
             loading="lazy" decoding="async" />
      </li>
      <li class="shrink-0">
        <img src="/images/cash.png" alt="Cash"
             class="h-7 w-auto rounded-md bg-white/90 p-1.5 ring-1 ring-black/5 shadow-sm"
             loading="lazy" decoding="async" />
      </li>
    </ul>
  </div>

  <!-- Shipping -->
  <div class="flex items-center gap-3 shrink-0 pl-4 border-l border-white/30">
    <span class="text-sm font-semibold uppercase tracking-wide text-slate-700/80">Shipping</span>
    <ul class="flex items-center gap-2">
      <li class="shrink-0">
        <img src="/images/dhl.png" alt="DHL"
             class="h-7 w-auto rounded-md bg-white/90 p-1.5 ring-1 ring-black/5 shadow-sm"
             loading="lazy" decoding="async" />
      </li>
      <li class="shrink-0">
        <img src="/images/fedex.png" alt="FedEx"
             class="h-7 w-auto rounded-md bg-white/90 p-1.5 ring-1 ring-black/5 shadow-sm"
             loading="lazy" decoding="async" />
      </li>
    </ul>
  </div>

  
</div>

            
          </div>
    </div>




<!-- Industrial Hero Banner -->
<section  v-if="!hideBanner" class="relative isolate overflow-hidden bg-slate-900">
  <!-- Responsive image (put files in /public/images/hero/) -->
  <picture>
    <!-- WebP sources -->
    <source
 
      type="image/webp"
      sizes="(min-width: 1024px) 1200px, 100vw"
    />
    <!-- JPEG fallback -->
    <source
     
      type="image/jpeg"
      sizes="(min-width: 1024px) 1200px, 100vw"
    />
    <img
      src="https://www.aabtools.com/banner/HomePageBanner/Desktop/Megger_Desktop.webp"
      alt="Industrial supply aisle with power tools, fasteners, and safety gear"
      class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover"
      loading="eager"
      decoding="async"
    />
  </picture>

  <!-- Readability overlay (dark to transparent) -->
  <div class="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/45 to-transparent"></div>

  <!-- Brand accent wash (lime/teal hint, very subtle) -->
  <div class="absolute inset-0 [mask-image:radial-gradient(80%_60% at 20%_40%,black,transparent)] 
              bg-[linear-gradient(to_right,#c2ff4a33,#22d3ee33_35%,transparent_70%)]"></div>

  <!-- Content -->
  <div class="absolute inset-0 flex items-center">
    <div class="max-w-screen-xl mx-auto px-4">
      <h1 class="text-white text-2xl md:text-3xl font-bold">
        Industrial Supplies &amp; MRO
      </h1>
      <p class="text-white/85 mt-1 text-sm md:text-base">
        Power tools, fasteners, abrasives, safety—trusted brands, fast shipping.
      </p>
       
    </div>
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

                  <button
                    @click="viewMode = 'pie'"
                    :class="[
                      'px-3 py-2 rounded border', 
                      viewMode === 'pie' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
                      ]"
                      >
                     <ChartPieIcon class="w-5 h-5" />
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
            <div
   v-else-if="!selectedDepartment"
  :class="[
    viewMode === 'grid'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px p-px bg-gray-300 overflow-hidden rounded-md'
      : 'flex flex-col divide-y divide-gray-200'
  ]"
>
  <div
    v-for="department in prodcutsDepartments"
    :key="department.id"
    @click="fetchSubCategories(department.id)"
    class="bg-white p-6 text-center cursor-pointer hover:bg-gray-50"
  >
    <div class="h-24 flex items-center justify-center">
      <img :src="`${$r2Url}/` + department.Image_path" alt="" class="max-h-24 w-auto object-contain" />
    </div>
    <h3 class="mt-3 text-sm font-medium text-gray-800 leading-tight">
      {{ department.Product_Department_Name }}
    </h3>
  </div>
            </div>


            <!-- Subcategory View -->
            <div
  v-else-if="selectedDepartment && !selectedSubCategory"
  :class="[
    viewMode === 'grid'
        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px p-px bg-gray-300 overflow-hidden rounded-md'
      : 'flex flex-col divide-y divide-gray-200'
  ]"
>
  <div
    v-for="sub in subCategories"
    :key="sub.id"
    @click="fetchSubSubCategories(sub.id)"
    class="bg-white p-6 text-center cursor-pointer hover:bg-gray-50"
  >
    <div class="h-24 flex items-center justify-center">
      <img
        :src="`${$r2Url}/` + sub.Image_path"
        alt=""
        class="max-h-24 w-auto object-contain"
      />
    </div>
    <h3 class="mt-3 text-sm font-medium text-gray-800 leading-tight">
      {{ sub.Sub_Department_Name }}
    </h3>
  </div>
            </div>


                 <!-- Sub-subcategory View -->
                  <div
                    v-else
                    :class="[
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px p-px bg-gray-300 overflow-hidden rounded-md'
                        : 'flex flex-col divide-y divide-gray-200'
                    ]"
                  >
              <div
                v-for="subSub in subSubCategories"
                :key="subSub.id"
                class="bg-white p-6 text-center hover:bg-gray-50"
              >
                <NuxtLink :to="`/departments/${subSub.Slug}`" class="block">
                  <div class="h-24 flex items-center justify-center">
                    <img
                      :src="`${$r2Url}/` + subSub.Image_Path"
                      alt=""
                      class="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <h3 class="mt-3 text-sm font-medium text-gray-800 leading-tight">
                    {{ subSub.Product_Sub_Sub_Department_Name }}
                  </h3>
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


