import axios from 'axios'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const userStore = useUserStore()
  const router = useRouter()

  const instance = axios.create({
    baseURL: config.public.apiBase,
    withCredentials: true, // ✅ required to send/receive cookies
  })


  // Optional: Add XSRF support (for Laravel CSRF protection)
  instance.interceptors.request.use((config) => {
    if (import.meta.client) {
      const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
      if (csrf) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrf[1])
      }
    }
    return config
  })


  instance.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config
    const status = error.response?.status

    // Prevent infinite loop
    if ((status === 401 || status === 419) && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await $fetch('/api/refresh', {
          method: 'POST',
          credentials: 'include'
        })

        // ✅ Retry the original request
        return instance(originalRequest)
      } catch (refreshError) {
        // ❌ Refresh failed — force logout
        userStore.clearUser()

        const guestRoutes = ['/login', '/register', '/forgot-password']
        const currentPath = router.currentRoute.value.path

        if (!guestRoutes.includes(currentPath)) {
          return await navigateTo('/login')
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)






  return {
    provide: {
      axios: instance,
    },
  }
})
