import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // SSR-safe token storage
  const token = useCookie<string | null>('token', {
    sameSite: 'lax',
    watch: true,
  })

  const user = ref<Record<string, any> | null>(null)
  const fetched = ref(false)
  const authloading = ref(true)
  const isAuthenticated = computed(() => !!user.value && !!token.value)

const setUser = (val: any) => {
  user.value = val
  fetched.value = true // ✅ Mark as fetched after setting user manually
}

  const clearUser = () => {
    user.value = null
    token.value = null
    fetched.value = false
  }

const fetchUser = async () => {
  if (fetched.value || !token.value) return

  try {
    const { $axios } = useNuxtApp()
    const response = await $axios.get('/api/user', {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    user.value = response.data.user
    fetched.value = true
  } catch (error: any) {
    // ✅ Only log out if the error is 401 or explicitly unauthenticated
    if (error?.response?.status === 401) {
      clearUser()
    }
    // Optionally: log the error to debug
    console.error('fetchUser error:', error)
  }
}


  const logout = async () => {
    try {
      const { $axios } = useNuxtApp()
      await $axios.post('/api/logout', {}, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
    } catch (error) {
      // Silent fail
    }

    clearUser()
    await navigateTo('/')
  }

  return {
    user,
    token,
    fetched,
    isAuthenticated,
    authloading,
    setUser,
    clearUser,
    fetchUser,
    logout, // ✅ exposed
  }
})
