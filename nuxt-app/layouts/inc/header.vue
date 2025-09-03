<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '~/stores/user'

import { useCartStore } from '~/stores/cart'
const cart = useCartStore()

const { user, isAuthenticated } = useAuth()
const userStore = useUserStore()
 

const logout = async () => {
   await userStore.logout()
}


const currentSection = ref<'categories' | 'products' | 'brand'>('categories')
const mobileMenuOpen = ref(false)
</script>
<template>

    <header class="sticky top-0 z-50 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 shadow-md">
  <div class="max-w-screen-xl mx-auto h-20 grid grid-cols-3 items-center px-4">

    <!-- Hamburger (mobile only) -->
    <button
      class="md:hidden justify-self-start text-white"
      @click="mobileMenuOpen = true"
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Logo (centered on all sizes) -->
    <NuxtLink to="/" class="justify-self-center inline-flex items-center">
      <img src="/logonew3.png" alt="ISC" class="h-12 md:h-14" />
    </NuxtLink>

    <!-- Desktop nav + welcome (right side) -->
    <div class="hidden md:flex justify-self-end items-center gap-6 text-white">
      <nav class="flex items-center gap-6 text-base font-semibold">
        <button
          @click="currentSection = 'categories'"
          :class="currentSection === 'categories' ? 'border-b-2 border-white/90' : 'border-b-2 border-transparent'"
          class="pb-1 hover:opacity-90 transition"
        >
          Categories
        </button>

        <button
          @click="currentSection = 'brand'"
          :class="currentSection === 'brand' ? 'border-b-2 border-white/90' : 'border-b-2 border-transparent'"
          class="pb-1 hover:opacity-90 transition"
        >
          Brands
        </button>

        <a href="#contact" class="pb-1 border-b-2 border-transparent hover:opacity-90 transition">
          Contact
        </a>
      </nav>

      <span v-if="isAuthenticated" class="hidden lg:inline-block text-sm font-medium px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20">
        Welcome, {{ user?.User_Name ?? 'Guest' }}
      </span>
    </div>
  </div>

  <!-- Overlay -->
  <div
    v-if="mobileMenuOpen"
    @click="mobileMenuOpen = false"
    class="fixed inset-0 bg-black/50 z-40 md:hidden"
  ></div>

  <!-- Mobile Drawer -->
  <div
    class="fixed top-0 left-0 w-64 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 md:hidden"
    :class="mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Drawer header -->
    <div class="p-4 flex justify-between items-center bg-gradient-to-r from-teal-600 to-cyan-500 text-white">
      <h3 class="text-lg font-bold">Menu</h3>
      <button
        @click="mobileMenuOpen = false"
        class="border border-white/70 px-2 py-1 rounded hover:bg-white hover:text-teal-700 transition"
        aria-label="Close menu"
      >
        Close
      </button>
    </div>

    <!-- Drawer nav -->
    <nav class="flex flex-col p-4 space-y-2 text-base font-semibold text-teal-800">
      <button
        @click="currentSection = 'categories'; mobileMenuOpen = false"
        :class="currentSection === 'categories' ? 'bg-cyan-50 text-teal-700 ring-1 ring-cyan-200' : 'border border-gray-200'"
        class="w-full text-left px-4 py-2 rounded hover:bg-cyan-50 transition"
      >
        Categories
      </button>

      <button
        @click="currentSection = 'brand'; mobileMenuOpen = false"
        :class="currentSection === 'brand' ? 'bg-cyan-50 text-teal-700 ring-1 ring-cyan-200' : 'border border-gray-200'"
        class="w-full text-left px-4 py-2 rounded hover:bg-cyan-50 transition"
      >
        Brands
      </button>

      <a
        href="#contact"
        @click="mobileMenuOpen = false"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 transition"
      >
        Contact
      </a>

      <NuxtLink
        v-if="!isAuthenticated"
        to="/login"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 transition"
      >
        Login
      </NuxtLink>

      <NuxtLink
        v-if="!isAuthenticated"
        to="/register"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 transition"
      >
        Register
      </NuxtLink>

      <NuxtLink
        v-if="isAuthenticated"
        :to="`/account`"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 transition flex items-center justify-between"
      >
        My Account
        <svg xmlns="http://www.w3.org/2000/svg" class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </NuxtLink>

      <button
        v-if="isAuthenticated"
        @click="logout"
        class="w-full px-4 py-2 rounded border border-gray-200 hover:bg-cyan-50 transition flex items-center justify-between"
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
      </div>
    </section>
<hr class="border-t border-gray-200">
</template>