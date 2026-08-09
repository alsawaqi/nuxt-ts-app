export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  return {
    provide: {
      r2Url: config.public.r2Url
    }
  }
})
