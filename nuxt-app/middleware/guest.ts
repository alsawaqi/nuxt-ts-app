export default defineNuxtRouteMiddleware(async () => {
  // Ensure it's only running on client
  if (import.meta.server) return

  const userStore = useUserStore()
  const token = useCookie<string | null>('token')

  if (!token.value) return

  if (!userStore.fetched) {
    await userStore.fetchUser()
  }

  if (userStore.isAuthenticated.valueOf()) {
    return navigateTo('/')
  }
})
