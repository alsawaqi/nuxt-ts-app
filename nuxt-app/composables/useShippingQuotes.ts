import { ref } from 'vue'
import { useNuxtApp } from '#imports'
import { createLatestRequestGate } from '~/utils/latestRequestGate.js'

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
  const requests = createLatestRequestGate()

  const clear = () => {
    requests.invalidate()
    options.value = []
    totals.value = null
    error.value = null
    loading.value = false
  }

  const fetchQuotes = async (payload: QuotePayload) => {
    // basic guard (so we don’t call API with empty payload)
    if (!payload?.address_id || !payload?.items?.length) {
      clear()
      return []
    }

    const requestId = requests.begin()
    loading.value = true
    error.value = null
    options.value = []
    totals.value = null

    try {
      const { data } = await $axios.post('/api/v1/shipping/quotes', payload)
      if (!requests.isCurrent(requestId)) return null

      options.value = data?.options ?? []
      totals.value = data?.totals ?? null
      return options.value
  
    } catch (e: any) {
      if (!requests.isCurrent(requestId)) return null

      error.value =
        e?.response?.data?.message || e?.message || 'Failed to fetch quotes'
      options.value = []
      totals.value = null
      return []
    } finally {
      if (requests.isCurrent(requestId)) loading.value = false
    }
  }

  return { options, loading, error, totals, fetchQuotes, clear }
}
