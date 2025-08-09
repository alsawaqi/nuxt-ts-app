import axios from 'axios'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const userStore = useUserStore()
  const router = useRouter()

  const instance = axios.create({
    baseURL: config.public.apiBase,   // Prefer SAME-ORIGIN proxy like https://app.example.com/api
    withCredentials: true,
  })

  // ✅ Forward browser cookies on SSR so /api/user works during server-render
  if (process.server) {
    const headers = useRequestHeaders(['cookie'])
    if (headers.cookie) {
      instance.defaults.headers.common['cookie'] = headers.cookie
    }
  }

  // Optional: XSRF for Sanctum-style CSRF (OK to keep; harmless with JWT)
  instance.interceptors.request.use((cfg) => {
    if (import.meta.client) {
      const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
      if (csrf) cfg.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrf[1])
    }
    return cfg
  })

  // ✅ 401/419 handler with refresh, no loops, and single source (Axios)
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const status = error.response?.status
      const originalRequest = error.config

      // Do not try to refresh if:
      // - already retried
      // - request WAS the refresh call
      const isRefreshCall = originalRequest?.url?.includes('/refresh')
      if ((status === 401 || status === 419) && !originalRequest?._retry && !isRefreshCall) {
        originalRequest._retry = true
        try {
          // Use the SAME axios instance so SSR cookie forwarding applies
          await instance.post('/refresh')
          // Retry original request
          return instance(originalRequest)
        } catch (e) {
          // Refresh failed -> clear and redirect if needed
          userStore.clearUser()
          const guestRoutes = ['/login', '/register', '/forgot-password']
          const path = router.currentRoute.value.path
          if (!guestRoutes.includes(path)) {
            // Don’t return navigateTo() into Axios flow; just redirect
            // and reject to unblock the awaiting call stack.
            navigateTo('/login')
          }
          return Promise.reject(e)
        }
      }

      return Promise.reject(error)
    }
  )

  return {
    provide: { axios: instance },
  }
})
