<script setup lang="ts">
const { locale, setLocale, t } = useStorefrontLocale()
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-semibold shadow-sm"
    :aria-label="t('nav.language')"
    dir="ltr"
  >
    <button
      type="button"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      @click="setLocale('en')"
    >
      EN
    </button>
    <button
      type="button"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      @click="setLocale('ar')"
    >
      عربي
    </button>
  </div>
</template>
