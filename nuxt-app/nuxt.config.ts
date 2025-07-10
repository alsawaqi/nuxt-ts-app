// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  components: true,
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
 vite: {
    optimizeDeps: {
      include: ['swiper', 'vue-easy-lightbox']
    }
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:83', 
      r2Url: 'https://pub-85c3b7ddc4814c45b25c1a5fb5bdad3f.r2.dev',
    }
  },
})