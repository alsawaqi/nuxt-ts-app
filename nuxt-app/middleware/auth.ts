export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore()
  const token = useCookie<string | null>('token')

  if (!token.value) {
    return navigateTo('/login')
  }

  try {
    if (!userStore.fetched) {
      await userStore.fetchUser()
    }

    if (!userStore.isAuthenticated.valueOf) {
      return navigateTo('/login')
    }
  } catch (err) {
    userStore.clearUser()
    return navigateTo('/')
  }
})
