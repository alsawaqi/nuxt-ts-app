<script setup lang="ts">
const { t, localePath } = useStorefrontLocale()
const currentYear = new Date().getFullYear()
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
          <li><NuxtLink :to="localePath('/policies/returns')" class="hover:text-slate-200 transition-colors">{{ t('footer.returns') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/policies/warranty')" class="hover:text-slate-200 transition-colors">{{ t('footer.warranty') }}</NuxtLink></li>
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
          <li><a href="tel:+96824460320" class="hover:text-slate-200 transition-colors">{{ t('footer.call') }}</a></li>
          <li><NuxtLink :to="localePath('/contact')" class="hover:text-slate-200 transition-colors">{{ t('footer.locations') }}</NuxtLink></li>
          <li><a href="mailto:motorsales@isc-depot.com" class="hover:text-slate-200 transition-colors">{{ t('footer.help') }}</a></li>
        </ul>
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
      </div>
    </div>
  </div>

  <!-- Bottom -->
  <div class="border-t border-slate-800">
    <div class="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <NuxtLink :to="localePath('/policies/terms')" class="hover:text-slate-200 transition-colors">{{ t('footer.terms') }}</NuxtLink>
        <NuxtLink :to="localePath('/policies/privacy')" class="hover:text-slate-200 transition-colors">{{ t('footer.privacy') }}</NuxtLink>
        <NuxtLink :to="localePath('/policies/shipping')" class="hover:text-slate-200 transition-colors">{{ t('nav.shipping') }}</NuxtLink>
        <NuxtLink :to="localePath('/policies/faq')" class="hover:text-slate-200 transition-colors">{{ t('footer.faq') }}</NuxtLink>
        <a href="/sitemap.xml" class="hover:text-slate-200 transition-colors">{{ t('footer.sitemap') }}</a>
      </nav>
      <p class="text-[11px]">{{ t('footer.rights', { year: currentYear }) }}</p>
    </div>
  </div>
</footer>


 

</template>


 
