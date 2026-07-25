// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: true,

  plugins: [
    '~/plugins/axios',
    '~/plugins/init-auth.global.ts',
  ],

  css: ['assets/css/storefront-rtl.css'],

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
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
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:83',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      r2Url: 'https://pub-85c3b7ddc4814c45b25c1a5fb5bdad3f.r2.dev',
    },
  },
})
