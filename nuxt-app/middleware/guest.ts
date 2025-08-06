import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()

  // If already authenticated and user info has been fetched
  if (userStore.isAuthenticated && userStore.fetched) {
    return navigateTo('/')
  }
})
