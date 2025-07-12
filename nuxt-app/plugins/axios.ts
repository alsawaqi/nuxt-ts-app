import axios from 'axios'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const instance = axios.create({
    baseURL: config.public.apiBase,
    withCredentials: true,
  })

  instance.interceptors.request.use((config) => {
    if (import.meta.client) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
      if (csrf) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrf[1])
      }
    }
    return config
  })

  instance.interceptors.response.use(
    res => res,
    error => {
      if (import.meta.client && (error.response?.status === 401 || error.response?.status === 419)) {
        localStorage.clear()
        window.location.href = '/'
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
