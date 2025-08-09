import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref<Record<string, any> | null>(null)
  const fetched = ref(false)
  const authloading = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  const setUser = (val: any) => {
    user.value = val
    fetched.value = true
  }

  const clearUser = () => {
    user.value = null
    fetched.value = false
  }

  const fetchUser = async (force = false) => {
    if (fetched.value && !force) return

    authloading.value = true
    try {
      const { $axios } = useNuxtApp()

      // Forward cookie on SSR; no-op on client
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

      const res = await $axios.get('/api/user', {
        withCredentials: true,
        headers, // <-- critical for SSR refresh
      })

      user.value = res.data.user
      fetched.value = true
    } catch (error: any) {
      if (error?.response?.status === 401) clearUser()
      else console.error('[fetchUser] error:', error)
    } finally {
      authloading.value = false
    }
  }

  const logout = async () => {
    try {
      const { $axios } = useNuxtApp()
      await $axios.post('/api/logout', {}, { withCredentials: true })
    } catch (_) {}
    clearUser()
    await navigateTo('/login')
  }

  return {
    user,
    fetched,
    isAuthenticated,
    authloading,
    setUser,
    clearUser,
    fetchUser,
    logout,
  }
})
