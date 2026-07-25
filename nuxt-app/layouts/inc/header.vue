<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '~/stores/user'

import { useCartStore } from '~/stores/cart'
import { useLoyaltyStore } from '~/stores/loyalty'
import SearchAutocomplete from '~/components/SearchAutocomplete.vue'
import { ShoppingBagIcon, CreditCardIcon } from '@heroicons/vue/24/solid'
import { stripLocalePrefix } from '~/utils/storefrontSeo.js'

const cart = useCartStore()
const loyalty = useLoyaltyStore()
const router = useRouter()
const { user, isAuthenticated } = useAuth()
const userStore = useUserStore()
const points = computed(() => loyalty.points)
const { t, isArabic, localePath } = useStorefrontLocale()
const route = useRoute()
const publicPath = computed(() => stripLocalePrefix(route.path))


const logout = async () => {
  await userStore.logout()
}



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

  router.push(`/product/id/${item.id}`)
}


const mobileMenuOpen = ref(false);
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
              :class="publicPath === '/' ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.home') }}
            </NuxtLink>
            <NuxtLink :to="{ path: localePath('/'), query: { section: 'categories' } }" class="pb-1 border-b-2" :class="(publicPath === '/' && (($route.query.section as string) ?? 'categories') === 'categories')
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent hover:text-slate-900'">
              {{ t('nav.shops') }}
            </NuxtLink>
            <NuxtLink :to="{ path: localePath('/'), query: { section: 'brand' } }" class="pb-1 border-b-2" :class="(publicPath === '/' && $route.query.section === 'brand')
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent hover:text-slate-900'">
              {{ t('nav.brands') }}
            </NuxtLink>
            <NuxtLink to="#" class="pb-1 border-b-2"
              :class="$route.path.startsWith('/dealerships') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.dealerships') }}
            </NuxtLink>
            <NuxtLink :to="localePath('/contact')" class="pb-1 border-b-2"
              :class="publicPath.startsWith('/contact') ? 'border-emerald-600 text-slate-900' : 'border-transparent hover:text-slate-900'">
              {{ t('nav.contact') }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Center: Logo + name (scale down at md, big at lg) -->
        <div class="justify-self-center flex flex-col items-center min-w-0">
          <NuxtLink :to="localePath('/')" class="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-4" @click="mobileMenuOpen = false">
            <img src="/logonew1.jpg" alt="Industrial Supplies Center LLC" class="h-10 w-auto object-contain sm:h-12 md:h-12 lg:h-16" />
          </NuxtLink>
          <span
            class="mt-1.5 sm:mt-2 text-[14px] sm:text-[15px] md:text-[15px] lg:text-[17px] font-semibold text-slate-800 text-center truncate">
            Industrial Supplies Center LLC
          </span>
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
        <NuxtLink :to="{ path: localePath('/'), query: { section: 'categories' } }" @click="mobileMenuOpen = false"
          class="text-left px-3 py-2 rounded hover:bg-slate-50">
          {{ t('nav.shops') }}
        </NuxtLink>

        <NuxtLink :to="{ path: localePath('/'), query: { section: 'brand' } }" @click="mobileMenuOpen = false"
          class="text-left px-3 py-2 rounded hover:bg-slate-50">
          {{ t('nav.brands') }}
        </NuxtLink>

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

</template>
