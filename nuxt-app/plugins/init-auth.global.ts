import { hasSessionCookie } from '~/utils/storefrontDelivery.js'

export default defineNuxtPlugin(async () => {
  const userStore = useUserStore()
  if (userStore.fetched) return

  // A guest SSR request has no session to refresh. Pinia carries this result
  // into hydration, avoiding a second guest check in the browser.
  if (import.meta.server && !hasSessionCookie(useRequestHeaders(['cookie']).cookie || '')) {
    userStore.clearUser()
    return
  }
  await userStore.fetchUser()
})
