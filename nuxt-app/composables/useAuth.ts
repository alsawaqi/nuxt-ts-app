// composables/useAuth.ts
import { useUserStore } from '~/stores/user'

export const useAuth = () => {
  const userStore = useUserStore()

  return {
    user: computed(() => userStore.user),
    customer: computed(() => userStore.customer),
    isAuthenticated: computed(() => !!userStore.user),
    loading: computed(() => !userStore.fetched),
  }
}
