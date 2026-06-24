<script setup lang="ts">
const { t } = useStorefrontLocale()
</script>

<template>
  <footer class="bg-slate-950 text-slate-400 text-xs">
  <!-- Top -->
  <div class="max-w-screen-xl mx-auto px-4 sm:px-6 pt-8 pb-6">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      <!-- Company -->
      <div>
        <h3 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.about') }}</h3>
        <ul class="space-y-1">
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.careers') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.customers') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.suppliers') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.media') }}</a></li>
        </ul>
      </div>

      <!-- Order Support -->
      <div>
        <h3 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.orderSupport') }}</h3>
        <ul class="space-y-1">
          <li><NuxtLink to="/account?tab=orders" class="hover:text-slate-200 transition-colors">{{ t('footer.existingOrders') }}</NuxtLink></li>
          <li><NuxtLink to="/policies/returns" class="hover:text-slate-200 transition-colors">{{ t('footer.returns') }}</NuxtLink></li>
          <li><NuxtLink to="/policies/warranty" class="hover:text-slate-200 transition-colors">{{ t('footer.warranty') }}</NuxtLink></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.invoices') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.specialOrders') }}</a></li>
        </ul>
      </div>

      <!-- Products -->
      <div>
        <h3 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.productsServices') }}</h3>
        <ul class="space-y-1">
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.productCollections') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.solutions') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.industries') }}</a></li>
        </ul>
      </div>

      <!-- Connect -->
      <div>
        <h3 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.connect') }}</h3>
        <ul class="space-y-1">
          <li><a href="tel:0000000000" class="hover:text-slate-200 transition-colors">{{ t('footer.call') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.locations') }}</a></li>
          <li><a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.help') }}</a></li>
        </ul>

        <div class="flex items-center gap-2 mt-3">
          <!-- Social (compact, accessible) -->
          <a href="#" class="p-1.5 rounded-md ring-1 ring-slate-800 hover:ring-slate-600 hover:text-slate-200 transition">
            <span class="sr-only">Facebook</span>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4z"/></svg>
          </a>
          <a href="#" class="p-1.5 rounded-md ring-1 ring-slate-800 hover:ring-slate-600 hover:text-slate-200 transition">
            <span class="sr-only">LinkedIn</span>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 6.5A2.44 2.44 0 1 1 4.5 4.06 2.44 2.44 0 0 1 6.94 6.5zM6.5 8.75H2.75V21.5H6.5zM21.25 21.5h-3.75v-6.62c0-1.58-.03-3.61-2.2-3.61-2.2 0-2.53 1.72-2.53 3.5V21.5H9.02V8.75h3.6v1.74h.05c.5-.95 1.72-1.95 3.54-1.95 3.78 0 4.48 2.49 4.48 5.73z"/></svg>
          </a>
          <a href="#" class="p-1.5 rounded-md ring-1 ring-slate-800 hover:ring-slate-600 hover:text-slate-200 transition">
            <span class="sr-only">YouTube</span>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5a4 4 0 0 0-2.8-2.8C18.1 4 12 4 12 4s-6.1 0-8.2.7A4 4 0 0 0 1 7.5C.3 9.6.3 12 .3 12s0 2.4.7 4.5a4 4 0 0 0 2.8 2.8C5.9 20 12 20 12 20s6.1 0 8.2-.7A4 4 0 0 0 23 16.5c.7-2.1.7-4.5.7-4.5s0-2.4-.7-4.5zM10 15.5v-7l6 3.5-6 3.5z"/></svg>
          </a>
          <a href="#" class="p-1.5 rounded-md ring-1 ring-slate-800 hover:ring-slate-600 hover:text-slate-200 transition">
            <span class="sr-only">X</span>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.1 8.1L23 22h-6.8l-5.3-6.9L4.8 22H2l7.6-8.7L1.4 2h6.9l4.8 6.3L18.9 2zM17.1 20h1.9L8.1 4H6.1l11 16z"/></svg>
          </a>
          <a href="#" class="p-1.5 rounded-md ring-1 ring-slate-800 hover:ring-slate-600 hover:text-slate-200 transition">
            <span class="sr-only">Instagram</span>
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm7-2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h14zm-1.5 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z"/></svg>
          </a>
        </div>
      </div>

      <!-- Email / App -->
      <div class="col-span-2 lg:col-span-1">
        <h3 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.emailSignup') }}</h3>
        <form class="group flex rounded-md overflow-hidden ring-1 ring-slate-800 focus-within:ring-slate-600 transition">
          <input
            type="email"
            :placeholder="t('footer.emailPlaceholder')"
            class="w-full px-3 py-2 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            class="px-3 py-2 bg-slate-200 text-slate-900 text-[12px] font-medium hover:bg-slate-300 transition"
          >
            {{ t('common.submit') }}
          </button>
        </form>

        <div class="mt-3">
          <h4 class="text-[11px] font-semibold tracking-wider text-slate-300 uppercase mb-2">{{ t('footer.mobile') }}</h4>
          <div class="flex items-center gap-2">
            <img src="#" alt="App Store" class="h-8 w-auto rounded ring-1 ring-slate-800" />
            <img src="#" alt="Google Play" class="h-8 w-auto rounded ring-1 ring-slate-800" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom -->
  <div class="border-t border-slate-800">
    <div class="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink to="/policies/terms" class="hover:text-slate-200 transition-colors">{{ t('footer.terms') }}</NuxtLink>
        <NuxtLink to="/policies/privacy" class="hover:text-slate-200 transition-colors">{{ t('footer.privacy') }}</NuxtLink>
        <NuxtLink to="/policies/shipping" class="hover:text-slate-200 transition-colors">{{ t('nav.shipping') }}</NuxtLink>
        <NuxtLink to="/policies/faq" class="hover:text-slate-200 transition-colors">{{ t('footer.faq') }}</NuxtLink>
        <a href="#" class="hover:text-slate-200 transition-colors">{{ t('footer.sitemap') }}</a>
      </nav>
      <p class="text-[11px]">{{ t('footer.rights') }}</p>
    </div>
  </div>
</footer>


 

</template>


 
