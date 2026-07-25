<script setup lang="ts">
  definePageMeta({
    layout: 'layout',
    alias: ['/ar'],
  })
import { ref, watch, onMounted, computed } from 'vue'
import { assetUrl, canonicalUrl, localizedAlternateLinks, openGraphLocale, organizationJsonLd, seoTitle, webPageJsonLd, websiteJsonLd } from '~/utils/storefrontSeo.js'
import SearchAutocomplete from '~/components/SearchAutocomplete.vue'
import { Squares2X2Icon, ListBulletIcon, ChartPieIcon, ShoppingBagIcon, CreditCardIcon } from '@heroicons/vue/24/solid'
import { useUserStore } from '~/stores/user'
import { useCartStore } from '~/stores/cart'
import { useLoyaltyStore } from '~/stores/loyalty'
import HomeSlider from '~/components/HomeSlider.vue'
const cart = useCartStore()
const loyalty = useLoyaltyStore()


const router = useRouter()
const route = useRoute()
const points = computed(() => loyalty.points)
const { user, isAuthenticated } = useAuth()
const userStore = useUserStore()
const { t, isArabic, locale, localePath, categoryName } = useStorefrontLocale()

const { $axios, $r2Url } = useNuxtApp();
const config = useRuntimeConfig()

type Section = 'categories' | 'products' | 'brand'




function gotoProduct(item: any) {
  if (item.Result_Type === 'category' && item.Slug) {
    router.push({
      path: localePath(`/departments/${item.Slug}`),
      query: item.Route_Query ?? {
        deptId: item.Product_Department_Id ?? undefined,
        subId: item.Product_Sub_Department_Id ?? undefined,
        subSubId: item.id ?? undefined,
      },
    })
    return
  }

  if (item.Slug) {
    router.push(localePath(`/product/${item.Slug}`))
    return
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

const viewMode = ref<'grid' | 'list' | 'pie'>('grid')

const { data: homeTaxonomy } = await useAsyncData(
  'storefront-home-taxonomy',
  async () => {
    const [departmentsResponse, brandsResponse] = await Promise.all([
      $axios.get('/api/productdepartment'),
      $axios.get('/api/productbrand'),
    ])

    return {
      departments: departmentsResponse.data || [],
      brands: brandsResponse.data || [],
    }
  },
  {
    default: () => ({
      departments: [] as ProductDepartment[],
      brands: [] as ProductBrand[],
    }),
  },
)

prodcutsDepartments.value = homeTaxonomy.value.departments
productBrands.value = homeTaxonomy.value.brands

const siteUrl = computed(() => String(config.public.siteUrl || ''))

useHead(() => {
  const title = locale.value === 'ar'
    ? 'المستلزمات الصناعية والأدوات في عُمان'
    : 'Industrial Supplies, Tools and Equipment in Oman'
  const description = locale.value === 'ar'
    ? 'تسوّق المستلزمات الصناعية والأدوات وقطع الغيار والمعدات من مركز المستلزمات الصناعية في سلطنة عُمان.'
    : 'Shop industrial supplies, tools, parts and equipment from Industrial Supplies Center LLC in Oman.'
  const canonical = canonicalUrl(siteUrl.value, localePath('/'))
  const image = assetUrl(siteUrl.value, '/logonew1.jpg')

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
      ...localizedAlternateLinks(siteUrl.value, '/'),
    ],
    script: [
      {
        key: 'organization-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(organizationJsonLd({
          siteUrl: siteUrl.value,
          email: 'motorsales@isc-depot.com',
          telephone: '+96824460320',
        })),
      },
      {
        key: 'website-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(websiteJsonLd({ siteUrl: siteUrl.value })),
      },
      {
        key: 'home-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(webPageJsonLd({
          siteUrl: siteUrl.value,
          path: localePath('/'),
          name: title,
          description,
          locale: locale.value,
        })),
      },
    ],
  }
})

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
  const subId = route.query.subId ? Number(route.query.subId) : null

  if (deptId) {
    await fetchSubCategories(deptId)
  }
  if (subId) {
    await fetchSubSubCategories(subId)
  }
}

/** Pick the items to render based on where you are in the tree */
type CategoryLevel = 'department' | 'subDepartment' | 'subSubDepartment'
const hovered = ref<number | null>(null)

const activePieLevel = computed<CategoryLevel>(() => {
  if (!selectedDepartment.value) return 'department'
  if (!selectedSubCategory.value) return 'subDepartment'
  return 'subSubDepartment'
})

const activePieLevelLabel = computed(() => {
  if (activePieLevel.value === 'department') return t('home.departments')
  if (activePieLevel.value === 'subDepartment') return t('home.subDepartments')
  return t('home.finalCategories')
})

const activePieTitle = computed(() => {
  if (activePieLevel.value === 'department') return t('home.browseDepartments')
  if (activePieLevel.value === 'subDepartment') return selectedDepartmentName.value || t('home.browseSubDepartments')
  return selectedSubCategoryName.value || t('home.browseFinalCategories')
})

const activePieSubtitle = computed(() => {
  if (activePieLevel.value === 'department') return t('home.departmentSubtitle')
  if (activePieLevel.value === 'subDepartment') return t('home.subDepartmentSubtitle')
  return t('home.finalCategorySubtitle')
})

const pieItems = computed(() => {
  if (activePieLevel.value === 'department') return prodcutsDepartments.value ?? []
  if (activePieLevel.value === 'subDepartment') return subCategories.value ?? []
  return subSubCategories.value ?? []
})

const getItemName = (it: any) => {
  if (!it) return ''
  return categoryName(it) || 'Untitled'
}

const getItemImage = (it: any) => {
  if (!it) return ''
  return activePieLevel.value === 'subSubDepartment'
    ? (it.Image_Path || it.Image_path || '')
    : (it.Image_path || it.Image_Path || '')
}

const imageSrc = (path?: string | null) => {
  if (!path) return ''
  const base = String($r2Url || '').replace(/\/$/, '')
  const cleanPath = String(path).replace(/^\/+/, '')
  return `${base}/${cleanPath}`
}

const selectedPieItem = computed(() => {
  if (hovered.value === null) return null
  return pieItems.value[hovered.value] || null
})

const selectedPieImage = computed(() => imageSrc(getItemImage(selectedPieItem.value)))

const centerLabel = computed(() => {
  if (selectedPieItem.value) return getItemName(selectedPieItem.value)
  return activePieLevelLabel.value
})

const selectedPieActionLabel = computed(() => (
  activePieLevel.value === 'subSubDepartment' ? t('common.openProducts') : t('common.explore')
))

const pieEmptyMessage = computed(() => {
  if (activePieLevel.value === 'department') return t('home.noDepartments')
  if (activePieLevel.value === 'subDepartment') return t('home.noSubDepartments')
  return t('home.noFinalCategories')
})

/** Click behavior by level */
const onSliceClick = (it: any) => {
  hovered.value = null

  if (activePieLevel.value === 'department') return fetchSubCategories(it.id)
  if (activePieLevel.value === 'subDepartment') return fetchSubSubCategories(it.id)

  const slug = it.Slug || it.slug
  if (!slug) return

  return router.push({
    path: localePath(`/departments/${slug}`),
    query: {
      deptId: selectedDepartment.value ? String(selectedDepartment.value) : undefined,
      subId: selectedSubCategory.value ? String(selectedSubCategory.value) : undefined,
      subSubId: it.id ? String(it.id) : undefined,
    },
  })
}

/** Donut math */

// Updated to include your brand colors (Blue and Emerald/Cyan) at the front
const palette = [
  '#07B6C6', '#2F5FB6', '#10b981', '#8b5cf6', '#f59e0b', 
  '#ef4444', '#14b8a6', '#06b6d4', '#6366f1', '#f97316'
]

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const arcPath = (cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) => {
  // Fix the SVG 360-degree rendering bug if there's only 1 item
  if (end - start === 360) end -= 0.01;
  
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
  const n = items.length
  if (!n) return []

  const step = 360 / n
  const gap = n > 1 && step > 4 ? 1.2 : 0
  
  // Expanded coordinates to give room for the hover pop-out effect
  // cx, cy moved from 100 to 120. Radiuses adjusted for a thicker, modern donut.
  const cx = 120, cy = 120, rOuter = 102, rInner = 58 
  
  return items.map((it: any, i: number) => {
    const start = i * step + gap / 2
    const end = (i + 1) * step - gap / 2
    return {
      item: it,
      id: it?.id ?? `${activePieLevel.value}-${i}`,
      label: getItemName(it),
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

const fetchSubCategories = async (departmentId: number) => {
  isloadingCategories.value = true
  try {

    selectedDepartment.value = departmentId
    selectedSubCategory.value = null
    hovered.value = null
    subCategories.value = []
    subSubCategories.value = []
    const response = await $axios.get(`/api/categories/${departmentId}/subcategories`)
    subCategories.value = response.data
  } catch (error) {
    console.error('Error fetching subcategories:', error)
  } finally {
    isloadingCategories.value = false
  }

}

// Fetch sub-subcategories
const fetchSubSubCategories = async (subCategoryId: number) => {

  isloadingCategories.value = true
  try {

    selectedSubCategory.value = subCategoryId
    hovered.value = null
    subSubCategories.value = []
    const response = await $axios.get(`/api/subcategories/${subCategoryId}/subsubcategories`)
    subSubCategories.value = response.data

  } catch (error) {
    console.error('Error fetching sub-subcategories:', error)
  } finally {
    isloadingCategories.value = false
  }

}



const selectedDepartmentName = computed(() => {
  return categoryName(prodcutsDepartments.value.find(d => d.id === selectedDepartment.value)) || ''
})

const selectedSubCategoryName = computed(() => {
  return categoryName(subCategories.value.find(s => s.id === selectedSubCategory.value)) || ''
})





const pieCrumbs = computed(() => {
  const crumbs = [
    {
      label: t('home.departments'),
      active: activePieLevel.value === 'department',
      action: () => resetToMainCategory(),
    },
  ]

  if (selectedDepartmentName.value) {
    crumbs.push({
      label: selectedDepartmentName.value,
      active: activePieLevel.value === 'subDepartment',
      action: () => {
        selectedSubCategory.value = null
        subSubCategories.value = []
        hovered.value = null
      },
    })
  }

  if (selectedSubCategoryName.value) {
    crumbs.push({
      label: selectedSubCategoryName.value,
      active: activePieLevel.value === 'subSubDepartment',
      action: () => {
        hovered.value = null
      },
    })
  }

  return crumbs
})


const categoryPath = computed(() => {
  return [selectedDepartmentName.value, selectedSubCategoryName.value]
    .filter(Boolean)
    .join(isArabic.value ? ' < ' : ' > ')
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

const logout = async () => {
  await userStore.logout()
}


onMounted(async () => {
  await restoreFromQuery()

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
            <span class="font-medium text-slate-700 hidden md:inline">{{ t('nav.payments') }}</span>
            <img src="/images/visa.png" class="h-3.5 sm:h-4" alt="Visa" loading="lazy" decoding="async" />
            <img src="/images/mastercard.png" class="h-3.5 sm:h-4" alt="Mastercard" loading="lazy" decoding="async" />
            <img src="/images/cash.png" class="h-3.5 sm:h-4" alt="Cash" loading="lazy" decoding="async" />
          </div>
          <div class="hidden sm:flex items-center gap-2 sm:gap-3">
            <span class="font-medium text-slate-700 hidden md:inline">{{ t('nav.shipping') }}</span>
            <img src="/images/dhl.png" class="h-3.5 sm:h-4" alt="DHL" loading="lazy" decoding="async" />
            <img src="/images/fedex.png" class="h-3.5 sm:h-4" alt="FedEx" loading="lazy" decoding="async" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-slate-500 truncate max-w-[50%] sm:max-w-none" v-if="isAuthenticated">
            {{ t('nav.welcome', { name: user?.User_Name || '' }) }}
            <span class="text-sm font-medium">{{ t('nav.points', { count: points }) }}</span>
          </span>
          <LanguageSwitcher />
        </div>


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
          <button class="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100" @click="mobileMenuOpen = true"
            aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Desktop nav (tighter at md, roomy at lg) -->
          <nav
            class="hidden md:flex items-center gap-5 lg:gap-8 text-[14px] md:text-[15px] lg:text-[17px] font-semibold text-slate-700">
            <NuxtLink :to="localePath('/')" class="pb-1 border-b-2"
              :class="$route.path === localePath('/') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.home') }}
            </NuxtLink>
            <button @click="currentSection = 'categories'" class="pb-1 border-b-2"
              :class="currentSection === 'categories' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.shops') }}
            </button>
            <button @click="currentSection = 'brand'" class="pb-1 border-b-2"
              :class="currentSection === 'brand' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.brands') }}
            </button>
            <NuxtLink to="#" class="pb-1 border-b-2"
              :class="$route.path.startsWith('/dealerships') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.dealerships') }}
            </NuxtLink>
            <NuxtLink :to="localePath('/contact')" class="pb-1 border-b-2"
              :class="$route.path === localePath('/contact') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.contact') }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Center: Logo + name (scale down at md, big at lg) -->
        <div class="justify-self-center flex flex-col items-center min-w-0">
          <NuxtLink :to="localePath('/')" class="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-4" @click="mobileMenuOpen = false">
            <img src="/logonew1.jpg" alt="Industrial Supplies Center LLC" class="h-10 w-auto object-contain sm:h-12 md:h-12 lg:h-16" />
          </NuxtLink>
          <h1
            class="mt-1.5 sm:mt-2 text-[14px] sm:text-[15px] md:text-[15px] lg:text-[17px] font-semibold text-slate-800 text-center truncate">
            Industrial Supplies Center LLC
          </h1>
        </div>

        <!-- Right: Cart + Checkout + Account -->
        <div class="justify-self-end flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-5">
          <!-- Cart (compact at md, larger at lg) -->
          <NuxtLink to="/cart" class="relative inline-flex items-center justify-center rounded-full p-1.5 md:p-2
                    ring-1 ring-slate-200 bg-white/90 hover:bg-white transition
                    hover:shadow-sm hover:ring-slate-300 focus:outline-none focus-visible:ring-2
                    focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1 text-slate-700" aria-label="Open cart"
            title="Cart">
            <!-- count badge -->
            <span v-if="cart.totalItems" class="pointer-events-none absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                      text-[10px] leading-[18px] text-white font-semibold grid place-items-center
                      rounded-full shadow-sm ring-1 ring-white
                      bg-gradient-to-br from-[#2F5FB6] to-[#07B6C6]">
              {{ cart.totalItems }}
            </span>

            <!-- icon -->
            <ShoppingBagIcon class="w-5 h-5 md:w-5 md:h-5" aria-hidden="true" />
          </NuxtLink>

          <!-- Compact mobile checkout -->
          <NuxtLink v-if="isAuthenticated" to="/cart" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
         bg-gradient-to-r from-[#2F5FB6] to-[#07B6C6] text-white 
         hover:opacity-90 shadow-sm text-[12px] font-medium 
         md:hidden transition">
            <CreditCardIcon class="w-4 h-4" aria-hidden="true" />

          </NuxtLink>

          <!-- Tablet + Desktop checkout -->
          <NuxtLink v-if="isAuthenticated" to="/cart" class="hidden md:inline-flex inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white
         bg-[#2f5fb6] hover:bg-[#264c95] shadow-sm
         focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#07B6C6]">
            <CreditCardIcon class="inline-block w-4 h-4 lg:w-5 lg:h-5" aria-hidden="true" />
            <span class="inline-block">{{ t('nav.checkout') }}</span>
          </NuxtLink>



          <!-- Account / Auth (HIDE at md to save width, show at lg) -->
          <div class="hidden lg:flex items-center gap-3 text-[15px]">



            <!-- My Account -->
            <NuxtLink v-if="isAuthenticated" to="/account" class="hidden md:inline-flex inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white 
                  bg-[#2f5fb6] hover:bg-[#264c95] shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#07B6C6]">

              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4S8 4.79 8 7s1.79 4 4 4zM4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
              </svg>
              <span class="flex-none">{{ t('nav.account') }}</span>
            </NuxtLink>


            <button v-if="isAuthenticated" @click="logout" class="px-3 py-1.5 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2f5fb6]">
              {{ t('nav.logout') }}
            </button>
            <template v-if="!isAuthenticated">
              <NuxtLink to="/login" class="px-3 py-1.5 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#07B6C6]">{{ t('nav.login') }}</NuxtLink>
              <NuxtLink to="/register" class="px-3 py-1.5 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6] shadow-sm
             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2f5fb6]">{{ t('nav.register') }}</NuxtLink>
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
        <SearchAutocomplete :min-chars="2" :limit="10" :placeholder="t('nav.searchPlaceholder')"
          @select="gotoProduct" />
      </div>
    </div>

    <hr />

    <!-- Mobile overlay & drawer -->
    <div v-if="mobileMenuOpen" @click="mobileMenuOpen = false" class="fixed inset-0 bg-black/40 z-40 md:hidden"></div>
    <div
      class="fixed top-0 w-[84%] max-w-80 h-full bg-white z-50 shadow-2xl transform transition-transform duration-300 md:hidden"
      :class="[
        isArabic ? 'right-0' : 'left-0',
        mobileMenuOpen ? 'translate-x-0' : (isArabic ? 'translate-x-full' : '-translate-x-full')
      ]">
      <div class="p-3 sm:p-4 flex justify-between items-center border-b">
        <NuxtLink :to="localePath('/')" class="flex items-center gap-2" @click="mobileMenuOpen = false">
          <img src="/logonew1.jpg" alt="ISC" class="h-7 sm:h-8 w-auto rounded ring-1 ring-black/10" />
          <span class="font-semibold">ISC</span>
        </NuxtLink>
        <button @click="mobileMenuOpen = false" class="px-2 py-1 rounded border hover:bg-slate-50">{{ t('common.close') }}</button>
      </div>

      <nav class="flex flex-col p-3 sm:p-4 text-slate-800 text-base font-medium space-y-1">
        <div class="px-3 py-2">
          <LanguageSwitcher />
        </div>
        <NuxtLink :to="localePath('/')" @click="mobileMenuOpen = false" class="px-3 py-2 rounded hover:bg-slate-50">{{ t('nav.home') }}</NuxtLink>
        <button @click="currentSection = 'categories'; mobileMenuOpen = false"
          class="text-left px-3 py-2 rounded hover:bg-slate-50">{{ t('nav.shops') }}</button>
        <button @click="currentSection = 'brand'; mobileMenuOpen = false"
          class="text-left px-3 py-2 rounded hover:bg-slate-50">{{ t('nav.brands') }}</button>
        <NuxtLink to="#" @click="mobileMenuOpen = false" class="px-3 py-2 rounded hover:bg-slate-50">{{ t('nav.dealerships') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/contact')" @click="mobileMenuOpen = false" class="px-3 py-2 rounded hover:bg-slate-50">{{ t('nav.contact') }}
        </NuxtLink>
        <div class="h-px my-2 bg-slate-200"></div>
        <template v-if="!isAuthenticated">
          <NuxtLink to="/login" @click="mobileMenuOpen = false" class="px-3 py-2 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95]
           focus:outline-none focus:ring-2 focus:ring-[#07B6C6]">{{ t('nav.login') }}</NuxtLink>
          <NuxtLink to="/register" @click="mobileMenuOpen = false" class="px-3 py-2 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6]
           focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]">{{ t('nav.register') }}</NuxtLink>
        </template>
        <template v-else>
          <NuxtLink to="/account" @click="mobileMenuOpen = false" class="px-3 py-2 rounded-md text-white bg-[#2f5fb6] hover:bg-[#264c95]
           focus:outline-none focus:ring-2 focus:ring-[#07B6C6]">{{ t('nav.account') }}</NuxtLink>
          <button v-if="isAuthenticated" @click="logout" mobileMenuOpen="false" class="text-left px-3 py-2 rounded-md text-white bg-[#07B6C6] hover:bg-[#0693a6]
           focus:outline-none focus:ring-2 focus:ring-[#2f5fb6]">
            {{ t('nav.logout') }}
          </button>
        </template>
      </nav>
    </div>
  </header>








  <!-- Advertisement Slider -->
  <HomeSlider v-if="!hideBanner" />



  <div class="flex items-center space-x-2 justify-start md:justify-end px-4 py-2">
    <input type="checkbox" id="hideBannerCheckbox" v-model="hideBanner" class="accent-blue-600">
    <label for="hideBannerCheckbox" class="text-sm text-gray-600 cursor-pointer">
      {{ !hideBanner ? t('home.hideBanner') : t('home.showBanner') }}</label>
  </div>

  <main class="container mx-auto p-6 flex-grow">
    <!-- Categories -->
    <section id="categories" v-if="currentSection === 'categories'" class="mb-10">


      <!-- Header -->
      <div class="flex items-center justify-between mb-3 sm:mb-6">
        <!-- Left: Back + breadcrumb -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Back button (tiny) -->
          <button v-if="selectedDepartment !== null || selectedSubCategory !== null" @click="goBack" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] sm:text-xs
                    bg-white ring-1 ring-slate-200 hover:bg-slate-50 hover:shadow-sm
                    transition-all duration-150 active:scale-[0.98] focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-sky-500" aria-label="Go back">
            <span class="text-slate-600 leading-none">{{ isArabic ? '→' : '←' }}</span>
            <span class="text-slate-700 font-medium leading-none">{{ t('common.back') }}</span>
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
        <div
          class="relative inline-flex items-center rounded-2xl bg-white/80 backdrop-blur ring-1 ring-slate-200 shadow-sm p-1 overflow-hidden">
          <!-- Active pill (animated) -->
          <span aria-hidden="true" class="pointer-events-none absolute left-1 top-1 z-0 h-8 w-8 md:h-10 md:w-10 rounded-xl
            bg-slate-900 shadow-lg shadow-slate-900/20 ring-1 ring-slate-900/10 motion-reduce:transition-none
            transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]" :style="{
              transform:
                viewMode === 'grid'
                  ? 'translateX(0%)'
                  : viewMode === 'list'
                    ? 'translateX(100%)'
                    : 'translateX(200%)'
            }">
            <span class="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-white/0 opacity-70"></span>
          </span>

          <button type="button" @click="viewMode = 'grid'" :aria-pressed="viewMode === 'grid'" :aria-label="t('home.gridView')"
            :title="t('home.gridView')" class="relative z-10 h-8 w-8 md:h-10 md:w-10 rounded-xl grid place-items-center
              text-slate-600 motion-reduce:transition-none transition-[color,transform] duration-200 ease-out
              hover:text-slate-900 hover:scale-[1.03] active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30
              focus-visible:ring-offset-2 focus-visible:ring-offset-white" :class="viewMode === 'grid' ? 'text-white' : ''">
            <Squares2X2Icon class="w-4 h-4 md:w-5 md:h-5 motion-reduce:transition-none transition-transform duration-200"
              :class="viewMode === 'grid' ? 'scale-110' : 'scale-100'" />
            <span class="sr-only">{{ t('home.gridView') }}</span>
          </button>

          <button type="button" @click="viewMode = 'list'" :aria-pressed="viewMode === 'list'" :aria-label="t('home.listView')"
            :title="t('home.listView')" class="relative z-10 h-8 w-8 md:h-10 md:w-10 rounded-xl grid place-items-center
              text-slate-600 motion-reduce:transition-none transition-[color,transform] duration-200 ease-out
              hover:text-slate-900 hover:scale-[1.03] active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30
              focus-visible:ring-offset-2 focus-visible:ring-offset-white" :class="viewMode === 'list' ? 'text-white' : ''">
            <ListBulletIcon class="w-4 h-4 md:w-5 md:h-5 motion-reduce:transition-none transition-transform duration-200"
              :class="viewMode === 'list' ? 'scale-110' : 'scale-100'" />
            <span class="sr-only">{{ t('home.listView') }}</span>
          </button>

          <button type="button" @click="viewMode = 'pie'" :aria-pressed="viewMode === 'pie'" :aria-label="t('home.pieView')"
            :title="t('home.pieView')" class="relative z-10 h-8 w-8 md:h-10 md:w-10 rounded-xl grid place-items-center
              text-slate-600 motion-reduce:transition-none transition-[color,transform] duration-200 ease-out
              hover:text-slate-900 hover:scale-[1.03] active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30
              focus-visible:ring-offset-2 focus-visible:ring-offset-white" :class="viewMode === 'pie' ? 'text-white' : ''">
            <ChartPieIcon class="w-4 h-4 md:w-5 md:h-5 motion-reduce:transition-none transition-transform duration-200"
              :class="viewMode === 'pie' ? 'scale-110' : 'scale-100'" />
            <span class="sr-only">{{ t('home.pieView') }}</span>
          </button>
        </div>
      </div>



      <div class="flex items-center space-x-2 mb-4">
        <!--loading spinner-->
        <div v-if="isloadingBrand" class="spinner-container">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2.93 6.07A8.003 8.003 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3.93-1.868zM12 20a8.003 8.003 0 01-6.07-2.93l-3.93 1.868A11.95 11.95 0 0012 24v-4zm6.07-2.93A8.003 8.003 0 0120 12h4c0 3.042-1.135 5.824-3 7.938l-3.93-1.868zM20 12a8.003 8.003 0 01-2.93-6.07l3.93-1.868A11.95 11.95 0 0024 12h-4z">
            </path>
          </svg>
        </div>
      </div>









      <div v-if="viewMode === 'pie'" class="w-full py-5">
        <div class="relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <span class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2F5FB6] via-[#07B6C6] to-emerald-500"></span>

          <div class="p-4 sm:p-5 lg:p-6">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <template v-for="(crumb, index) in pieCrumbs" :key="crumb.label">
                    <button type="button" @click="crumb.action()" :disabled="crumb.active"
                      class="rounded-full px-3 py-1 transition-colors"
                      :class="crumb.active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                      {{ crumb.label }}
                    </button>
                    <span v-if="index < pieCrumbs.length - 1" class="text-slate-300">/</span>
                  </template>
                </div>

                <h3 class="mt-3 text-xl sm:text-2xl font-bold text-slate-900">
                  {{ activePieTitle }}
                </h3>
                <p class="mt-1 text-sm text-slate-500">
                  {{ activePieSubtitle }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button v-if="selectedDepartment" type="button" @click="goBack"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  {{ t('common.back') }}
                </button>
                <button v-if="selectedDepartment" type="button" @click="resetToMainCategory"
                  class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  {{ t('home.departments') }}
                </button>
              </div>
            </div>

            <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,420px),1fr] lg:items-center">
              <div class="relative mx-auto w-full max-w-[420px]">
                <div v-if="isloadingCategories"
                  class="absolute inset-6 z-10 grid place-items-center rounded-full bg-white/80 backdrop-blur-sm">
                  <svg class="h-8 w-8 animate-spin text-[#07B6C6]" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2.93 6.07A8.003 8.003 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3.93-1.868zM12 20a8.003 8.003 0 01-6.07-2.93l-3.93 1.868A11.95 11.95 0 0012 24v-4z">
                    </path>
                  </svg>
                </div>

                <svg viewBox="0 0 240 240" class="donut-entrance w-full h-auto overflow-visible drop-shadow-sm">
                  <g v-for="(s, i) in slices" :key="`${activePieLevel}-${s.id}`"
                    class="cursor-pointer outline-none transition-all duration-300 ease-out"
                    :class="[
                      hovered === i ? 'scale-[1.055] drop-shadow-lg' : '',
                      hovered !== null && hovered !== i ? 'opacity-35' : 'opacity-100'
                    ]" tabindex="0" @mouseenter="hovered = i" @mouseleave="hovered = null"
                    @focus="hovered = i" @blur="hovered = null" @click="onSliceClick(s.item)"
                    @keyup.enter="onSliceClick(s.item)" style="transform-origin: 120px 120px;">
                    <path :d="s.d" :fill="s.color" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" />
                  </g>

                  <circle cx="120" cy="120" r="55" fill="white" stroke="#e2e8f0" stroke-width="1" />

                  <foreignObject x="48" y="55" width="144" height="130">
                    <div class="flex h-full w-full flex-col items-center justify-center px-2 text-center pointer-events-none">
                      <div class="mb-2 grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                        <img v-if="selectedPieImage" :src="selectedPieImage" alt="" class="h-full w-full object-contain p-1" />
                        <ChartPieIcon v-else class="h-5 w-5 text-[#07B6C6]" />
                      </div>
                      <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {{ hovered !== null ? activePieLevelLabel : t('common.currentLevel') }}
                      </span>
                      <span class="mt-1 line-clamp-3 text-[13px] font-bold leading-snug text-slate-900">
                        {{ centerLabel }}
                      </span>
                      <span class="mt-1 text-[11px] font-semibold text-slate-400">
                        {{ t(pieItems.length === 1 ? 'common.item' : 'common.items', { count: pieItems.length }) }}
                      </span>
                    </div>
                  </foreignObject>
                </svg>
              </div>

              <div class="min-w-0">
                <div v-if="!pieItems.length && !isloadingCategories"
                  class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  {{ pieEmptyMessage }}
                </div>

                <TransitionGroup v-else name="pie-list" tag="div" class="grid gap-2 sm:grid-cols-2">
                  <button v-for="(s, i) in slices" :key="`list-${activePieLevel}-${s.id}`" type="button"
                    @mouseenter="hovered = i" @mouseleave="hovered = null" @focus="hovered = i" @blur="hovered = null"
                    @click="onSliceClick(s.item)" class="group flex min-h-[66px] items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-all duration-200
                      hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#07B6C6]/50"
                    :class="hovered === i ? 'border-slate-300 shadow-md' : 'border-slate-200'">
                    <span class="h-9 w-1.5 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-bold text-slate-900">
                        {{ s.label }}
                      </span>
                      <span class="mt-0.5 block text-xs font-semibold text-slate-400">
                        {{ activePieLevelLabel }}
                      </span>
                    </span>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 transition
                      group-hover:bg-slate-900 group-hover:text-white">
                      {{ selectedPieActionLabel }}
                    </span>
                  </button>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
      </div>

            <!-- Category View -->
            <div v-else-if="!selectedDepartment">
              <!-- Grid Mode: Premium card layout -->
              <div v-if="viewMode === 'grid'">
                <TransitionGroup name="cat" tag="div"
                  class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  <button v-for="department in prodcutsDepartments" :key="department.id"
                    @click="fetchSubCategories(department.id)" :aria-label="categoryName(department)" class="group relative text-left rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
                                      hover:shadow-md hover:ring-slate-300 transition-all duration-200 focus:outline-none
                                      focus-visible:ring-2 focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1">
                    <div class="p-4">
                      <!-- Image area -->
                      <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                                              ring-1 ring-slate-100 overflow-hidden">
                        <img :src="`${$r2Url}/` + department.Image_path" alt="" class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                                            group-hover:scale-[1.03]" />
                      </div>

                      <!-- Title -->
                      <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
                        {{ categoryName(department) }}
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
                <div v-for="department in prodcutsDepartments" :key="department.id" @click="fetchSubCategories(department.id)"
                  class="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50">
                  <img :src="`${$r2Url}/` + department.Image_path" alt="" class="h-16 w-16 object-contain" />
                  <span class="text-base font-medium text-gray-800">{{ categoryName(department) }}</span>
                </div>
              </div>
            </div>

            <!-- Subcategory View -->
            <div v-else-if="selectedDepartment && !selectedSubCategory">

              <!-- GRID mode -->
              <div v-if="viewMode === 'grid'" class="">
                <div class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  <button v-for="sub in subCategories" :key="sub.id" @click="fetchSubSubCategories(sub.id)"
                    :aria-label="categoryName(sub)" class="group relative text-left rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
                  hover:shadow-md hover:ring-slate-300 transition-all duration-200 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-[#07B6C6] focus-visible:ring-offset-1">
                    <div class="p-4">
                      <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                          ring-1 ring-slate-100 overflow-hidden">
                        <img :src="`${$r2Url}/` + sub.Image_path" alt="" class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                        group-hover:scale-[1.03]" />
                      </div>

                      <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
                        {{ categoryName(sub) }}
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
                <button v-for="sub in subCategories" :key="sub.id" @click="fetchSubSubCategories(sub.id)"
                  class="flex items-center gap-4 p-4 text-left hover:bg-gray-50">
                  <img :src="`${$r2Url}/` + sub.Image_path" alt="" class="h-16 w-16 object-contain" />
                  <span class="text-base font-medium text-gray-800">{{ categoryName(sub) }}</span>
                </button>
              </div>

            </div>


            <!-- Sub-subcategory View -->
            <div v-else>

              <!-- GRID mode -->
              <div v-if="viewMode === 'grid'">
                <div class="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  <NuxtLink v-for="subSub in subSubCategories" :key="subSub.id" :to="{
                    path: localePath(`/departments/${subSub.Slug}`),
                    query: {
                      deptId: selectedDepartment ?? undefined,
                      subId: selectedSubCategory ?? undefined,
                      subSubId: subSub.id
                    }
                  }" :aria-label="categoryName(subSub)" class="group relative rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm
                  hover:shadow-md hover:ring-slate-300 transition-all duration-200">
                    <div class="p-4">
                      <div class="aspect-[4/3] w-full rounded-xl bg-slate-50 grid place-items-center
                          ring-1 ring-slate-100 overflow-hidden">
                        <img :src="`${$r2Url}/` + subSub.Image_Path" alt="" class="max-h-full max-w-[92%] object-contain transition-transform duration-200
                        group-hover:scale-[1.03]" />
                      </div>

                      <h3 class="mt-3 text-[13px] sm:text-[14px] font-semibold text-slate-800 line-clamp-2">
                        {{ categoryName(subSub) }}
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
                <NuxtLink v-for="subSub in subSubCategories" :key="subSub.id" :to="{
                  path: localePath(`/departments/${subSub.Slug}`),
                  query: {
                    deptId: selectedDepartment ?? undefined,
                    subId: selectedSubCategory ?? undefined,
                    subSubId: subSub.id
                  }
                }" class="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <img :src="`${$r2Url}/` + subSub.Image_Path" alt="" class="h-16 w-16 object-contain" />
                  <span class="text-base font-medium text-gray-800">
                    {{ categoryName(subSub) }}
                  </span>
                </NuxtLink>
              </div>

            </div>







    </section>



    <!-- Brands -->
    <section id="brand" v-if="currentSection === 'brand'">
      <h2 class="text-3xl font-bold mb-6">{{ t('home.ourBrands') }}</h2>


      <div class="flex space-x-6 overflow-x-auto">

        <div v-for="brand in productBrands"
          class="flex-shrink-0 w-32 h-20 bg-white rounded shadow flex items-center justify-center p-2">
          <img :src="`${$r2Url}/` + brand.Brands_Image_Path" alt="DeWalt" class="h-full object-contain">
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
  transition: opacity 600ms cubic-bezier(.22, .61, .36, 1),
    transform 600ms cubic-bezier(.22, .61, .36, 1);
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
  from {
    opacity: 0;
    transform: scale(1.02);
  }

  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

@keyframes heroKen {
  from {
    transform: scale(1.06);
  }

  to {
    transform: scale(1.10);
  }
}

@keyframes washDrift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
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
.cat-leave-active {
  transition: all .18s ease;
}

.cat-enter-from,
.cat-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(.98);
}

.pie-list-enter-active,
.pie-list-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.pie-list-enter-from,
.pie-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}



/* Premium Donut Chart Entrance Animation */
.donut-entrance {
  animation: donutPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  will-change: transform, opacity;
}

@keyframes donutPop {
  0% {
    opacity: 0;
    transform: scale(0.85) rotate(-15deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {

  .cat-enter-active,
  .cat-leave-active,
  .pie-list-enter-active,
  .pie-list-leave-active {
    transition: none !important;
  }

  .donut-entrance {
    animation: none !important;
  }
}
</style>
