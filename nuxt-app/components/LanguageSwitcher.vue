<script setup lang="ts">
import { isLocalizedPublicPath, localizedPath } from '~/utils/storefrontSeo.js'

const { locale, setLocale, t } = useStorefrontLocale()
const route = useRoute()
const usesLocalizedRoute = computed(() => isLocalizedPublicPath(route.path))
const languagePath = (target: 'en' | 'ar') => localizedPath(route.fullPath, target)
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-semibold shadow-sm"
    :aria-label="t('nav.language')"
    dir="ltr"
  >
    <a
      v-if="usesLocalizedRoute"
      :href="languagePath('en')"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      :aria-current="locale === 'en' ? 'page' : undefined"
    >
      EN
    </a>
    <button
      v-else
      type="button"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      @click="setLocale('en')"
    >
      EN
    </button>
    <a
      v-if="usesLocalizedRoute"
      :href="languagePath('ar')"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      :aria-current="locale === 'ar' ? 'page' : undefined"
    >
      عربي
    </a>
    <button
      v-else
      type="button"
      class="rounded-full px-2.5 py-1 transition"
      :class="locale === 'ar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
      @click="setLocale('ar')"
    >
      عربي
    </button>
  </div>
</template>
