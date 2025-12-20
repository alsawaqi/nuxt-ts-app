 <script setup lang="ts">
import { computed } from 'vue'

interface LoyaltyTx {
  id: number
  Loyalty_Transaction_Code: string
  Customer_Id: number
  Orders_Placed_Id?: number | null
  Points_Earned: number
  Points_Redeemed: number
  Balance_After?: number | null   // ✅ from API
  created_at: string
  updated_at?: string
}

const props = defineProps<{
  loading?: boolean
  transactions?: LoyaltyTx[]
  totalPoints?: number
  pagination?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  } | null
}>()

const emit = defineEmits<{
  (e: 'page-change', page: number): void
  (e: 'per-page-change', perPage: number): void
}>()

const rows = computed(() => {
  const list = [...(props.transactions ?? [])] // assume API already returns newest-first
  return list.map(tx => {
    const credit = Number(tx.Points_Earned || 0)
    const debit  = Number(tx.Points_Redeemed || 0)
    const delta  = credit - debit
    return {
      ...tx,
      credit,
      debit,
      delta,
      balanceAfter: Number(tx.Balance_After ?? 0), // ✅ accurate even with pagination
      kind: delta > 0 ? 'credit' : delta < 0 ? 'debit' : 'neutral'
    }
  })
})

const totalPointsComputed = computed(() =>
  typeof props.totalPoints === 'number'
    ? props.totalPoints
    : (props.transactions ?? []).reduce((s, t) => s + (t.Points_Earned || 0) - (t.Points_Redeemed || 0), 0)
)

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
    .format(new Date(iso))
</script>

<template>
  <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
      <h2 class="text-lg font-semibold text-slate-900">Loyalty Transactions</h2>

      <div class="inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-1 ring-1 ring-emerald-200">
        <span class="text-sm font-semibold">{{ totalPointsComputed }}</span>
        <span class="text-xs">points</span>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <!-- Loading skeleton -->
      <div v-if="loading" class="divide-y divide-slate-200">
        <div v-for="i in 6" :key="i" class="p-4 grid grid-cols-12 gap-3 animate-pulse bg-white">
          <div class="col-span-3 h-4 bg-slate-100 rounded"></div>
          <div class="col-span-3 h-4 bg-slate-100 rounded"></div>
          <div class="col-span-2 h-4 bg-slate-100 rounded"></div>
          <div class="col-span-2 h-4 bg-slate-100 rounded"></div>
          <div class="col-span-2 h-4 bg-slate-100 rounded"></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!rows.length" class="p-8 text-center text-slate-500 bg-white">
        No loyalty activity yet.
      </div>

      <!-- Rows -->
      <table v-else class="min-w-full text-sm bg-white">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="text-left px-4 py-3 font-medium">Date</th>
            <th class="text-left px-4 py-3 font-medium">Reference</th>
            <th class="text-left px-4 py-3 font-medium">Activity</th>
            <th class="text-right px-4 py-3 font-medium">Earned</th>
            <th class="text-right px-4 py-3 font-medium">Redeemed</th>
            <th class="text-right px-4 py-3 font-medium">Balance</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="tx in rows" :key="tx.id" class="hover:bg-slate-50/60 transition-colors">
            <td class="px-4 py-3 whitespace-nowrap text-slate-800">
              {{ fmtDate(tx.created_at) }}
            </td>

            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ tx.Loyalty_Transaction_Code }}</div>
              <div v-if="tx.Orders_Placed_Id" class="text-xs text-slate-500">
                Order #{{ tx.Orders_Placed_Id }}
              </div>
            </td>

            <td class="px-4 py-3">
              <div
                class="inline-flex items-center gap-2 rounded-full px-2.5 py-1"
                :class="tx.kind==='credit' ? 'bg-blue-50 ring-1 ring-blue-100' :
                        tx.kind==='debit'  ? 'bg-red-50 ring-1 ring-red-100'  :
                                            'bg-slate-50 ring-1 ring-slate-200'"
              >
                <svg v-if="tx.kind==='credit'" class="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 17c3-6 7-9 12-9"/><path d="M13 6h5v5"/>
                </svg>
                <svg v-else-if="tx.kind==='debit'" class="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 7c3 6 7 9 12 9"/><path d="M13 18h5v-5"/>
                </svg>
                <svg v-else class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12h16"/>
                </svg>

                <span class="font-semibold"
                      :class="tx.kind==='credit' ? 'text-blue-700' :
                              tx.kind==='debit'  ? 'text-red-700'  : 'text-slate-600'">
                  {{ tx.delta > 0 ? '+' + tx.delta : tx.delta }} pts
                </span>
              </div>
            </td>

            <td class="px-4 py-3 text-right">
              <span class="text-slate-900 font-medium">{{ tx.credit || 0 }}</span>
            </td>

            <td class="px-4 py-3 text-right">
              <span class="text-slate-900 font-medium">{{ tx.debit || 0 }}</span>
            </td>

            <td class="px-4 py-3 text-right">
              <span class="font-semibold text-emerald-600">{{ tx.balanceAfter }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ✅ Pagination Footer -->
      <div v-if="pagination" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white">
        <div class="text-xs text-slate-600">
          <span v-if="pagination.from && pagination.to">
            Showing <b>{{ pagination.from }}</b>–<b>{{ pagination.to }}</b> of <b>{{ pagination.total }}</b>
          </span>
          <span v-else>
            Total: <b>{{ pagination.total }}</b>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <select
            :value="pagination.per_page"
            @change="emit('per-page-change', Number(($event.target as HTMLSelectElement).value))"
            class="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm"
            :disabled="loading"
          >
            <option :value="10">10 / page</option>
            <option :value="20">20 / page</option>
            <option :value="50">50 / page</option>
          </select>

          <button class="px-3 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  :disabled="loading || pagination.current_page <= 1"
                  @click="emit('page-change', 1)">
            First
          </button>

          <button class="px-3 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  :disabled="loading || pagination.current_page <= 1"
                  @click="emit('page-change', pagination.current_page - 1)">
            Prev
          </button>

          <span class="text-xs text-slate-600 px-2">
            Page <b>{{ pagination.current_page }}</b> / {{ pagination.last_page }}
          </span>

          <button class="px-3 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  :disabled="loading || pagination.current_page >= pagination.last_page"
                  @click="emit('page-change', pagination.current_page + 1)">
            Next
          </button>

          <button class="px-3 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  :disabled="loading || pagination.current_page >= pagination.last_page"
                  @click="emit('page-change', pagination.last_page)">
            Last
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-3 flex items-center gap-4 text-xs text-slate-500">
      <div class="inline-flex items-center gap-1">
        <svg class="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 17c3-6 7-9 12-9"/><path d="M13 6h5v5"/>
        </svg>
        <span>Earned</span>
      </div>
      <div class="inline-flex items-center gap-1">
        <svg class="h-3.5 w-3.5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 7c3 6 7 9 12 9"/><path d="M13 18h5v-5"/>
        </svg>
        <span>Redeemed</span>
      </div>
    </div>
  </section>
</template>
