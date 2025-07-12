import { storeToRefs } from 'pinia'
import { useUserStore } from '~/stores/user'

export const useAuth = () => {
  const userStore = useUserStore()
  const { user, isAuthenticated } = storeToRefs(userStore)

  return {
    user,
    isAuthenticated,
  }
}
