export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const r2Url = String(config.public.uploadsUrl || config.public.r2Url || '').replace(/\/+$/, '')
  return {
    provide: {
      r2Url
    }
  }
})
