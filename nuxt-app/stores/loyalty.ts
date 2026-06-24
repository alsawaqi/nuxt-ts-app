import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLoyaltyStore = defineStore('loyalty', () => {
  const points = ref(0)
  const loading = ref(false)
  const loaded = ref(false)

  const clear = () => {
    points.value = 0
    loading.value = false
    loaded.value = false
  }

  const fetchPoints = async (force = false) => {
    if (import.meta.server) return points.value
    if (loading.value) return points.value
    if (loaded.value && !force) return points.value

    loading.value = true
    try {
      const { $axios } = useNuxtApp()
      const response = await $axios.get('/api/loyalty', { withCredentials: true })
      points.value = Number(response.data || 0)
      loaded.value = true
    } catch {
      clear()
    } finally {
      loading.value = false
    }

    return points.value
  }

  const refresh = () => fetchPoints(true)

  return {
    points,
    loading,
    loaded,
    fetchPoints,
    refresh,
    clear,
  }
})
