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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between
            bg-slate-900 text-white px-6 py-4 rounded-t-xl border-b border-slate-700">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium tracking-wide">
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
    <li
      v-for="(step, idx) in TRACK_STEPS"
      :key="step"
      class="flex items-center w-full"
    >
      <!-- Step bubble + label -->
      <div class="flex flex-col items-center text-center w-24">
        <!-- bubble -->
        <div
          class="relative flex h-14 w-14 items-center justify-center rounded-full shadow transition-colors duration-150"
          :class="idx <= activeStepIndex
            ? 'bg-cyan-600 text-white'
            : 'bg-white text-slate-400 ring-1 ring-slate-300'"
        >
          <!-- subtle ring highlight / halo -->
          <div
            class="absolute inset-0 rounded-full pointer-events-none"
            :class="idx <= activeStepIndex
              ? 'ring-4 ring-cyan-200/40'
              : 'ring-4 ring-transparent'"
          ></div>

          <!-- ICONS -->
          <!-- 1. Order Received -->
          <svg
            v-if="step === 'pending'"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- clipboard / receipt -->
            <path d="M9 2.75h6c.69 0 1.25.56 1.25 1.25v.5h.5A2.75 2.75 0 0 1 19.5 7.25v11A2.75 2.75 0 0 1 16.75 21h-9.5A2.75 2.75 0 0 1 4.5 18.25v-11A2.75 2.75 0 0 1 7.25 4.5h.5v-.5c0-.69.56-1.25 1.25-1.25z" />
            <path d="M9 9h6M9 13h3" />
          </svg>

          <!-- 2. Processing -->
          <svg
            v-else-if="step === 'processing'"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- gear-ish progress -->
            <circle cx="12" cy="12" r="3.5" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.54-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.54V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.54 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c0 .7.62 1.3 1.32 1.3H21a2 2 0 1 1 0 4h-.09c-.7 0-1.3.62-1.51 1.32z"
            />
          </svg>

          <!-- 3. Packed -->
          <svg
            v-else-if="step === 'packed'"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- box -->
            <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
            <path d="M12 12v9" />
            <path d="M20.5 7.5 12 12 3.5 7.5" />
          </svg>

          <!-- 4. Dispatched -->
          <svg
            v-else-if="step === 'dispatched'"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- warehouse / leaving -->
            <path d="M3 10V21h18V10L12 3 3 10z" />
            <path d="M9 21v-6h6v6" />
            <path d="M9 10h6" />
          </svg>

          <!-- 5. Shipped -->
          <svg
            v-else-if="step === 'shipped'"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- truck -->
            <path d="M3 7h11v9H3z" />
            <path d="M14 10h4l3 3v3h-7z" />
            <circle cx="7.5" cy="18" r="1.5" />
            <circle cx="17.5" cy="18" r="1.5" />
          </svg>

          <!-- 6. Delivered -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- home + check -->
            <path d="M3 11.5 12 4l9 7.5V21H3z" />
            <path d="M9 21v-6h6v6" />
            <path d="M15 11.5l-2.5 2.5-1.5-1.5" />
          </svg>
        </div>

        <!-- label -->
        <div
          class="mt-2 text-[12px] font-medium leading-tight"
          :class="idx <= activeStepIndex ? 'text-slate-900' : 'text-slate-500'"
        >
          {{ STEP_LABEL[step] }}
        </div>
      </div>

      <!-- connector line -->
      <div
        v-if="idx < TRACK_STEPS.length - 1"
        class="mx-2 h-[2px] flex-1 rounded-full transition-colors duration-150"
        :class="idx < activeStepIndex ? 'bg-cyan-500' : 'bg-slate-200'"
      ></div>
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
