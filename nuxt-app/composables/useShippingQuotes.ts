import { ref } from 'vue'
import { useNuxtApp } from '#imports'

type QuoteItem = { product_id: number; qty: number }
type QuotePayload = {
  address_id: number
  items: QuoteItem[]
  include_heavy?: boolean
}

export function useShippingQuotes() {
  const { $axios } = useNuxtApp() as any

  const options = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totals = ref<any | null>(null)

  const clear = () => {
    options.value = []
    totals.value = null
    error.value = null
  }

  const fetchQuotes = async (payload: QuotePayload) => {
    // basic guard (so we don’t call API with empty payload)
    if (!payload?.address_id || !payload?.items?.length) {
      clear()
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data } = await $axios.post('/api/v1/shipping/quotes', payload)
      options.value = data?.options ?? []
      totals.value = data?.totals ?? null
      return options.value
    } catch (e: any) {
      error.value =
        e?.response?.data?.message || e?.message || 'Failed to fetch quotes'
      clear()
      return []
    } finally {
      loading.value = false
    }
  }

  return { options, loading, error, totals, fetchQuotes, clear }
}
