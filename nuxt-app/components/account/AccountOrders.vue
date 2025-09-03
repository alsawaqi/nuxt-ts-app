<script setup lang="ts">
import { ref, computed, toRefs, withDefaults } from 'vue'

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: number
  Transaction_Number: number
  Total_Price: string
  Status: OrderStatus | string
  created_at: string
  Carrier?: string | null
  Tracking_Number?: string | null
  Expected_Date?: string | null
}

const props = withDefaults(defineProps<{
  orders: Order[]
  loading?: boolean
}>(), { loading: false })

const { orders, loading } = toRefs(props)

const emit = defineEmits<{ (e: 'show-details', orderId: number): void }>()
const openDetails = (id: number) => emit('show-details', id)
const onRowClick  = (id: number) => emit('show-details', id)

// Tracking modal
const showTrackModal = ref(false)
const trackingOrder  = ref<Order | null>(null)

const TRACK_STEPS: OrderStatus[] = [
  'pending', 'processing', 'packed', 'dispatched', 'shipped', 'delivered'
]

const STEP_LABEL: Record<OrderStatus, string> = {
  pending:    'Order Received',
  processing: 'Processing',
  packed:     'Packed',
  dispatched: 'Dispatched',
  shipped:    'Shipped',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
}

const openTracking  = (order: Order) => { trackingOrder.value = order; showTrackModal.value = true }
const closeTracking = () => { showTrackModal.value = false; trackingOrder.value = null }

const activeStepIndex = computed(() => {
  if (!trackingOrder.value) return 0
  const key = String(trackingOrder.value.Status).toLowerCase() as OrderStatus
  const idx = TRACK_STEPS.indexOf(key)
  return idx < 0 ? 0 : idx
})

const statusChip = (s: OrderStatus | string) => ({
  pending:    'bg-amber-50   text-amber-700   ring-amber-200',
  processing: 'bg-blue-50    text-blue-700    ring-blue-200',
  packed:     'bg-violet-50  text-violet-700  ring-violet-200',
  dispatched: 'bg-sky-50     text-sky-700     ring-sky-200',
  shipped:    'bg-cyan-50    text-cyan-700    ring-cyan-200',
  delivered:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled:  'bg-red-50     text-red-700     ring-red-200',
}[String(s).toLowerCase() as OrderStatus] ?? 'bg-slate-100 text-slate-700 ring-slate-200')

const statusDot = (s: OrderStatus | string) => ({
  pending:    'bg-amber-500',
  processing: 'bg-blue-500',
  packed:     'bg-violet-500',
  dispatched: 'bg-sky-500',
  shipped:    'bg-cyan-500',
  delivered:  'bg-emerald-500',
  cancelled:  'bg-red-500',
}[String(s).toLowerCase() as OrderStatus] ?? 'bg-slate-400')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Recent Orders</h2>
      <div class="text-xs text-slate-500">Showing {{ orders.length }} orders</div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div class="text-sm font-medium text-slate-700">Order History</div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="divide-y divide-slate-100">
        <div v-for="i in 4" :key="i" class="px-4 py-3 animate-pulse">
          <div class="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div class="h-3 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 sticky top-0 z-10">
            <tr class="text-slate-600">
              <th class="px-4 py-3 text-left font-semibold">Order #</th>
              <th class="px-4 py-3 text-left font-semibold">Date</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Total</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="order in orders"
              :key="order.id"
              class="hover:bg-slate-50 transition cursor-pointer"
              @click="onRowClick(order.id)"
            >
              <td class="px-4 py-3 font-medium text-slate-900">
                {{ order.Transaction_Number }}
              </td>

              <td class="px-4 py-3 text-slate-700">
                {{ order.created_at }}
              </td>

              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ring-1 cursor-pointer select-none"
                  :class="statusChip(order.Status)"
                  @click.stop="openTracking(order)"
                  title="Track this order"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="statusDot(order.Status)" />
                  {{ order.Status }}
                </span>
              </td>

              <td class="px-4 py-3 font-semibold text-slate-900">
                OMR {{ order.Total_Price }}
              </td>

              <td class="px-4 py-3 text-right">
                <button
                  class="inline-flex items-center gap-2 text-cyan-700 hover:text-cyan-900 font-medium"
                  @click.stop="openDetails(order.id)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7a5 5 0 100 10A5 5 0 0012 7zm8.94 5c-.46.9-3.73 7-8.94 7S3.52 12.9 3.06 12c.46-.9 3.73-7 8.94-7s8.48 6.1 8.94 7z"/>
                  </svg>
                  Order Details
                </button>
              </td>
            </tr>

            <tr v-if="!orders || orders.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-slate-500">
                You don’t have any orders yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Tracking Modal -->
  <div v-if="showTrackModal" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/40" @click="closeTracking"></div>

    <div class="relative mx-auto mt-[8vh] w-[min(960px,95vw)] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 text-white px-5 py-3">
        <div class="flex items-center justify-between">
          <div class="text-sm">
            <span class="opacity-80">TRACKING ORDER NO - </span>
            <span class="font-semibold">{{ trackingOrder?.Transaction_Number }}</span>
          </div>
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" @click="closeTracking">Close</button>
        </div>
      </div>

      <!-- Meta -->
      <div class="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <div><span class="text-slate-500">Shipped Via:</span> <span class="ml-1 font-medium text-slate-800">{{ trackingOrder?.Carrier || '—' }}</span></div>
        <div>
          <span class="text-slate-500">Status:</span>
          <span class="ml-1 font-medium text-slate-800">
            {{ STEP_LABEL[(String(trackingOrder?.Status || 'pending').toLowerCase()) as OrderStatus] }}
          </span>
        </div>
        <div v-if="trackingOrder?.Expected_Date"><span class="text-slate-500">Expected Date:</span> <span class="ml-1 font-medium text-slate-800">{{ trackingOrder?.Expected_Date }}</span></div>
      </div>

      <!-- Progress -->
      <div class="px-6 py-8">
        <ol class="flex items-center">
          <li v-for="(step, idx) in TRACK_STEPS" :key="step" class="flex items-center w-full">
            <div class="flex flex-col items-center text-center w-24">
              <div class="h-14 w-14 rounded-full flex items-center justify-center shadow"
                   :class="idx <= activeStepIndex ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'">
                <!-- icons per step -->
                <svg v-if="step==='pending'" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14h9.45c.75 0 1.41-.41 1.75-1.05l2.76-5.02a1 1 0 0 0-.88-1.48H6.21L5.27 3H2v2h2l3.6 7.59-.94 1.72A2 2 0 0 0 8.28 17H19v-2H8.53l.63-1.14z"/></svg>
                <svg v-else-if="step==='processing'" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M19.14 12.94a7 7 0 11-7.09-8.94v2.02a5 5 0 105.07 6.26l2.02.66zM13 2h-2v6h2V2z"/></svg>
                <svg v-else-if="step==='packed'" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5zM5 9.2l6 3.33V19L5 15.67V9.2zm14 6.47L13 19v-6.47l6-3.33v6.47zM12 10.53L6 7.2l6-3.33 6 3.33-6 3.33z"/></svg>
                <svg v-else-if="step==='dispatched'" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M18 6H3v9h1a3 3 0 006 0h4a3 3 0 006 0h1V9l-3-3zM7 17a1 1 0 110-2 1 1 0 010 2zm10 0a1 1 0 110-2 1 1 0 010 2zM19 9h-3V7h1.59L19 8.41V9z"/></svg>
                <svg v-else-if="step==='shipped'" viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M3 16v-4h13v4h5v2H2v-2h1zm13-8H3V6h13v2zm3 0h-2V6h1.59L19 7.41V8z"/></svg>
                <svg v-else viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              </div>
              <div class="mt-2 text-[12px] font-medium" :class="idx <= activeStepIndex ? 'text-slate-900' : 'text-slate-500'">
                {{ STEP_LABEL[step] }}
              </div>
            </div>

            <div v-if="idx < TRACK_STEPS.length - 1" class="h-1 mx-2 flex-1 rounded-full"
                 :class="idx < activeStepIndex ? 'bg-cyan-500' : 'bg-slate-200'"></div>
          </li>
        </ol>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm">
        <div class="text-slate-600">
          <span v-if="trackingOrder?.Tracking_Number">Tracking #:
            <span class="font-medium">{{ trackingOrder?.Tracking_Number }}</span>
          </span>
        </div>
        <button class="rounded-md bg-white px-3 py-1.5 ring-1 ring-slate-200 hover:bg-slate-50" @click="closeTracking">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
