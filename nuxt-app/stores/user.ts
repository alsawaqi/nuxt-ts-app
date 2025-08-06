import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
 
   

  const user = ref<Record<string, any> | null>(null)
  const fetched = ref(false)
  const authloading = ref(true)
  const isAuthenticated = computed(() => !!user.value)

const setUser = (val: any) => {
  user.value = val
  fetched.value = true // ✅ Mark as fetched after setting user manually
}

  const clearUser = () => {
    user.value = null
   
    fetched.value = false
  }

const fetchUser = async () => {
  if (fetched.value) return

  try {
    const { $axios } = useNuxtApp()
    const response = await $axios.get('/api/user', { withCredentials: true })

    console.log('User information :', response.data);

    user.value = response.data.user
    fetched.value = true
  } catch (error: any) {
    console.error('[fetchUser] error:', error)
    if (error?.response?.status === 401) {
      clearUser()
    }
  }
}




 const logout = async () => {
  try {
    const { $axios } = useNuxtApp()
    await $axios.post('/api/logout', {}, { withCredentials: true })
  } catch (error) {
    // Silent fail
  }

  clearUser()
  await navigateTo('/login')
}
 

  return {
    user,
  
    fetched,
    isAuthenticated,
    authloading,
    setUser,
    clearUser,
    fetchUser,
    logout, // ✅ exposed
  }
})
