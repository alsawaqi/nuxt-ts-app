<script setup lang="ts">
import { findPolicyPage, policyPages } from '~/utils/policyPages'
import { assetUrl, breadcrumbJsonLd, canonicalUrl, localizedAlternateLinks, openGraphLocale, seoDescription, seoTitle, webPageJsonLd } from '~/utils/storefrontSeo.js'

definePageMeta({
  layout: 'layouts',
  alias: ['/ar/policies/:slug'],
})

const route = useRoute()
const config = useRuntimeConfig()
const { t, field, locale, localePath } = useStorefrontLocale()
const slug = computed(() => String(route.params.slug || ''))
const page = computed(() => findPolicyPage(slug.value))
const siteUrl = computed(() => String(config.public.siteUrl || ''))

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Policy page not found' })
}

watch(page, (nextPage) => {
  if (!nextPage) {
    showError(createError({ statusCode: 404, statusMessage: 'Policy page not found' }))
  }
})

useHead(() => {
  const title = field(page.value, 'title') || 'Policy'
  const description = seoDescription(field(page.value, 'summary'))
  const basePath = `/policies/${slug.value}`
  const currentPath = localePath(basePath)
  const canonical = canonicalUrl(siteUrl.value, currentPath)
  const image = assetUrl(siteUrl.value, '/logonew1.jpg')

  return {
    title: seoTitle(title),
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: seoTitle(title) },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'article' },
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
      ...localizedAlternateLinks(siteUrl.value, basePath),
    ],
    script: [
      {
        key: 'policy-page-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(webPageJsonLd({
          siteUrl: siteUrl.value,
          path: currentPath,
          name: title,
          description,
          locale: locale.value,
        })),
      },
      {
        key: 'policy-breadcrumb-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbJsonLd([
          { name: t('common.home'), path: localePath('/') },
          { name: title, path: currentPath },
        ], siteUrl.value)),
      },
    ],
  }
})
</script>

<template>
  <section class="bg-slate-50">
    <div class="max-w-5xl mx-auto px-4 py-10 md:py-14">
      <nav class="mb-6 text-sm text-slate-600">
        <NuxtLink :to="localePath('/')" class="hover:text-cyan-700">{{ t('common.home') }}</NuxtLink>
        <span class="mx-2">/</span>
        <span>{{ field(page, 'title') }}</span>
      </nav>

      <div class="mb-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-cyan-700">{{ t('footer.orderSupport') }}</p>
        <h1 class="mt-2 text-3xl font-bold text-slate-950">{{ field(page, 'title') }}</h1>
        <p class="mt-3 max-w-3xl text-slate-600">{{ field(page, 'summary') }}</p>
      </div>

      <div class="grid gap-4">
        <section
          v-for="section in page?.sections"
          :key="section.heading"
          class="border border-slate-200 bg-white p-5"
        >
          <h2 class="text-lg font-semibold text-slate-900">{{ field(section, 'heading') }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-700">{{ field(section, 'body') }}</p>
        </section>
      </div>

      <div class="mt-10 border-t border-slate-200 pt-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-600">{{ t('footer.orderSupport') }}</h2>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            v-for="item in policyPages"
            :key="item.slug"
            :to="localePath(`/policies/${item.slug}`)"
            class="rounded-md border px-3 py-2 text-sm"
            :class="item.slug === slug ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'"
          >
            {{ field(item, 'title') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
