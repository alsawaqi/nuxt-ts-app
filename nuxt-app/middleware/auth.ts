import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()

  // If not authenticated and user info has already been fetched
  if (!userStore.isAuthenticated && userStore.fetched) {
    return navigateTo('/login')
  }
})
