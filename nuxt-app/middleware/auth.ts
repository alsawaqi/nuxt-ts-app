import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async (to) => {
  const store = useUserStore()

  // Skip fetch on login route (optional optimization)
  if (to.path !== '/login') {
    await store.fetchUser()
    if (!store.isAuthenticated) return navigateTo('/login')
  }
})
