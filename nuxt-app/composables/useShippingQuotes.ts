import { ref } from 'vue'

export function useShippingQuotes() {
  const { $axios } = useNuxtApp()
  const options = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchQuotes = async (payload:
    | { address_id: number, totals: { weight_kg: number, volume_cbm: number }, include_heavy?: boolean }
    | { destination: any, totals: { weight_kg: number, volume_cbm: number }, include_heavy?: boolean }
  ) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await $axios.post('/api/v1/shipping/quotes', payload)
      options.value = data?.options ?? []
    } catch (e:any) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch quotes'
      options.value = []
    } finally {
      loading.value = false
    }
  }

  return { options, loading, error, fetchQuotes }
}
