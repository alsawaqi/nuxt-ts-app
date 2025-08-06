export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()

  if (!userStore.fetched) {
    try {
         await userStore.fetchUser()
    } catch (e) {
      console.warn('[INIT AUTH] No user or auth failed')
    }
  }
})
