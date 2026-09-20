// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

const apiBase = process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:83'
const uploadsUrl = process.env.NUXT_PUBLIC_UPLOADS_URL || apiBase.replace(/\/+$/, '') + '/storage'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: true,

  plugins: [
    '~/plugins/axios',
    '~/plugins/init-auth.global.ts',
  ],

  css: ['assets/css/storefront-rtl.css'],

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/image'],
  image: { provider: 'ipx', quality: 78, format: ['webp'], domains: [] },
  routeRules: {
    '/**': { headers: { 'cache-control': 'private, no-store' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=3600' } },
  },
  components: true,

  devtools: {
    enabled: true,
    timeline: { enabled: true },
  },

  vite: {
    optimizeDeps: { include: ['swiper', 'vue-easy-lightbox'] },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')

            if (normalizedId.includes('/node_modules/@pdf-lib/standard-fonts/')) {
              return 'pdf-standard-fonts'
            }

            if (normalizedId.includes('/node_modules/@pdf-lib/upng/')) {
              return 'pdf-png'
            }

            if (normalizedId.includes('/node_modules/pdf-lib/')) {
              return 'pdf-engine'
            }
          },
        },
      },
    },
  },

  runtimeConfig: {
    apiBaseInternal: '',
    public: {
      apiBase,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      uploadsUrl,
      r2Url: uploadsUrl,
    },
  },
})
