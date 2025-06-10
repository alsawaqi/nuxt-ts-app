import axios from 'axios'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const instance = axios.create({
    baseURL: config.public.apiBase as string,
    withCredentials: true, // Send cookies like XSRF-TOKEN
  })

  // Helper to read a cookie value
  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] : null
  }

  // Auto-add Bearer token + CSRF token (if available)
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (process.client) {
      const csrfToken = getCookie('XSRF-TOKEN')
      if (csrfToken) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken)
      }
    }

    return config
  })

  // Global error handling
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401 || error.response?.status === 419) {
        localStorage.clear()
        window.location.href = '/'
      } else if (error.response?.status === 403) {
        window.location.href = '/'
      }
      return Promise.reject(error)
    }
  )

  return {
    provide: {
      axios: instance
    }
  }
})
