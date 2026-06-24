import { watch } from 'vue'
import { useCartStore } from '~/stores/cart'
import { useLoyaltyStore } from '~/stores/loyalty'
import { useUserStore } from '~/stores/user'

export default defineNuxtPlugin(() => {
  const cart = useCartStore()
  const loyalty = useLoyaltyStore()
  const userStore = useUserStore()

  watch(
    () => userStore.isAuthenticated,
    async (authed) => {
      try {
        await cart.loadCart()
      } catch (error) {
        console.error('Failed to initialize cart:', error)
      }

      if (authed) {
        await loyalty.refresh()
      } else {
        loyalty.clear()
      }
    },
    { immediate: true },
  )
})
