import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useLoyaltyStore } from '~/stores/loyalty'

export const useUserStore = defineStore('user', () => {
  const user = ref<Record<string, any> | null>(null)
  const customer = ref<Record<string, any> | null>(null)
  const fetched = ref(false)
  const authloading = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  const setUser = (val: any) => {
    user.value = val
    fetched.value = true
  }

  const clearUser = () => {
    user.value = null
    fetched.value = true
    customer.value = null
    if (import.meta.client) useLoyaltyStore().clear()
  }

  const fetchUser = async (force = false) => {
    if (fetched.value && !force) return

    authloading.value = true
    try {
      const { $axios } = useNuxtApp()

      // Forward cookie on SSR; no-op on client
      const headers = import.meta.env.SSR ? useRequestHeaders(['cookie']) : undefined

      const res = await $axios.get('/api/user', {
        withCredentials: true,
        headers, // <-- critical for SSR refresh
      })

      user.value = res.data.user
      customer.value = res.data.customer
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
  useLoyaltyStore().clear()

  if (import.meta.client) {
    localStorage.removeItem('amwal_pending_order')
    localStorage.removeItem('checkout_prefill')
    localStorage.removeItem('checkout_idempotency_key')
    localStorage.removeItem('checkout_idempotency_signature')
  }

  // ✅ switch cart back to guest state
  const cart = useCartStore()
  await cart.loadCart()

  await navigateTo('/login')
}

  return {
    user,
    customer,
    fetched,
    isAuthenticated,
    authloading,
    setUser,
    clearUser,
    fetchUser,
    logout,
  }
})
