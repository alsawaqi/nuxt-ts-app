<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'packed'
  | 'dispatched'
  | 'shipped'
  | 'ready_for_collection'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: number
  Transaction_Number: string | number
  Order_Code?: string | null
  Total_Price: string | number
  Status: OrderStatus | string
  Delivery_Type?: string | null
  Shipping_Price?: string | number | null
  created_at: string
  Carrier?: string | null
  Tracking_Number?: string | null
  Expected_Date?: string | null
}

interface OrderDetails {
  order: {
    id: number
    order_code?: string | null
    transaction_number?: string | null
    status?: string | null
    created_at?: string | null
  }
  items: Array<{
    id: number
    product_name?: string | null
    product_code?: string | null
    product_slug?: string | null
    image_path?: string | null
    quantity: number
    unit_price: number
    original_unit_price?: number
    discounted_unit_price?: number
    unit_discount_amount?: number
    line_discount_amount?: number
    discount?: {
      id?: number | null
      code?: string | null
      name?: string | null
      type?: string | null
      value?: number | null
    } | null
    subtotal: number
    vat: number
    status?: string | null
  }>
  fulfillment: {
    type?: 'ship' | 'pickup' | string | null
    shipping?: {
      shipper_name?: string | null
      destination_label?: string | null
      basis?: string | null
      price?: number | null
      currency?: string | null
      weight_kg?: number | null
      volume_cbm?: number | null
      address?: {
        contact_name?: string | null
        phone?: string | null
        email?: string | null
        title?: string | null
        designation?: string | null
        remarks?: string | null
        country?: string | null
        region?: string | null
        district?: string | null
        city?: string | null
      } | null
    }
    pickup?: {
      location_name?: string | null
      location_code?: string | null
    }
  }
  payment: {
    method?: string | null
    status?: string | null
    amount?: number | null
    currency?: string | null
    card?: {
      brand?: string | null
      last4?: string | null
      exp_month?: string | number | null
      exp_year?: string | number | null
      gateway?: string | null
      transaction_id?: string | null
      auth_code?: string | null
    } | null
    transfer?: {
      reference?: string | null
      payer_name?: string | null
      bank_name?: string | null
      received_at?: string | null
    } | null
    cod?: {
      collected?: boolean | number | null
      collected_at?: string | null
      note?: string | null
    } | null
  }
  transaction?: {
    header_code?: string | null
    bill_no?: string | null
  }
  totals: {
    original_subtotal?: number
    product_discount?: number
    subtotal: number
    vat: number
    shipping: number
    before_loyalty: number
    loyalty_points_redeemed: number
    loyalty_discount: number
    grand_total: number
    currency?: string | null
  }
}

const props = withDefaults(defineProps<{
  orders: Order[]
  loading?: boolean
  detailsLoading?: boolean
  showDetails?: boolean
  selectedDetails?: OrderDetails | null
  activeOrderId?: number | null
  pagination?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  } | null
}>(), {
  loading: false,
  detailsLoading: false,
  showDetails: false,
  selectedDetails: null,
  activeOrderId: null,
  pagination: null,
})

const { orders, loading } = toRefs(props)
const { $r2Url } = useNuxtApp()
const { t, locale } = useStorefrontLocale()

const emit = defineEmits<{
  (e: 'show-details', orderId: number): void
  (e: 'close-details'): void
  (e: 'filter-change', filters: { from?: string; to?: string; status?: string; q?: string }): void
  (e: 'page-change', page: number): void
  (e: 'per-page-change', perPage: number): void
}>()

const filters = ref({
  from: '',
  to: '',
  status: '',
  q: '',
})

const showTrackModal = ref(false)
const trackingOrder = ref<Order | null>(null)

const SHIPPING_TRACK_STEPS: OrderStatus[] = ['pending', 'packed', 'dispatched', 'shipped', 'delivered']
const PICKUP_TRACK_STEPS: OrderStatus[] = ['pending', 'packed', 'dispatched', 'ready_for_collection', 'delivered']

const STEP_LABEL: Record<OrderStatus, string> = {
  pending: 'Order placed',
  processing: 'Processing',
  packed: 'Packaging',
  dispatched: 'Dispatched',
  shipped: 'In shipment',
  ready_for_collection: 'Ready for collection',
  delivered: 'Complete',
  cancelled: 'Cancelled',
}

const orderStatusLabel = (status?: OrderStatus | string | null) => {
  const key = String(status || 'pending').toLowerCase()
  return t(`account.status.${key}`)
}

const stepLabel = (status: OrderStatus) => orderStatusLabel(status)

const detail = computed(() => props.selectedDetails)
const detailOrder = computed(() => detail.value?.order ?? null)
const detailTotals = computed(() => detail.value?.totals ?? null)
const detailItems = computed(() => detail.value?.items ?? [])
const deliveryType = computed(() => detail.value?.fulfillment?.type || 'ship')
const payment = computed(() => detail.value?.payment ?? null)
const currency = computed(() => detailTotals.value?.currency || payment.value?.currency || 'OMR')

const currentTrackSteps = computed<OrderStatus[]>(() => {
  const type = String(trackingOrder.value?.Delivery_Type || '').toLowerCase()
  return type === 'pickup' ? PICKUP_TRACK_STEPS : SHIPPING_TRACK_STEPS
})

const activeStepIndex = computed(() => {
  if (!trackingOrder.value) return 0
  const rawKey = String(trackingOrder.value.Status).toLowerCase()
  const key = (rawKey === 'processing' ? 'dispatched' : rawKey) as OrderStatus
  const idx = currentTrackSteps.value.indexOf(key)
  return idx < 0 ? 0 : idx
})

const openDetails = (id: number) => emit('show-details', id)
const onRowClick = (id: number) => emit('show-details', id)
const applyFilters = () => emit('filter-change', { ...filters.value })
const clearFilters = () => {
  filters.value = { from: '', to: '', status: '', q: '' }
  emit('filter-change', {})
}
const openTracking = (order: Order) => {
  trackingOrder.value = order
  showTrackModal.value = true
}
const closeTracking = () => {
  showTrackModal.value = false
  trackingOrder.value = null
}

const money = (value?: number | string | null, code = 'OMR') => {
  const amount = Number(value ?? 0)
  const displayCode = !code || code === 'OMR' ? t('common.omr') : code
  return `${displayCode} ${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'}`
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale.value === 'ar' ? 'ar-OM' : 'en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale.value === 'ar' ? 'ar-OM' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const imageSrc = (path?: string | null) => {
  if (!path) return ''
  const base = String($r2Url || '').replace(/\/$/, '')
  return `${base}/${String(path).replace(/^\/+/, '')}`
}

const statusChip = (s: OrderStatus | string | null | undefined) => ({
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  packed: 'bg-violet-50 text-violet-700 ring-violet-200',
  dispatched: 'bg-sky-50 text-sky-700 ring-sky-200',
  shipped: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  ready_for_collection: 'bg-teal-50 text-teal-700 ring-teal-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
}[String(s || '').toLowerCase() as OrderStatus] ?? 'bg-slate-100 text-slate-700 ring-slate-200')

const statusDot = (s: OrderStatus | string | null | undefined) => ({
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  packed: 'bg-violet-500',
  dispatched: 'bg-sky-500',
  shipped: 'bg-cyan-500',
  ready_for_collection: 'bg-teal-500',
  delivered: 'bg-emerald-500',
  cancelled: 'bg-red-500',
}[String(s || '').toLowerCase() as OrderStatus] ?? 'bg-slate-400')

const paymentLabel = (method?: string | null) => ({
  card: t('account.payment.card'),
  cod: t('account.payment.cod'),
  transfer: t('account.payment.transfer'),
  loyalty: t('account.payment.loyalty'),
}[String(method || '').toLowerCase()] ?? t('account.notRecorded'))

const paymentStatusLabel = (status?: string | null) => ({
  paid: t('orders.paymentPaid'),
  paid_requires_review: t('orders.paymentRequiresReview'),
  pending: t('orders.paymentPending'),
  failed: t('orders.paymentFailed'),
  cancelled: t('orders.paymentCancelled'),
  unpaid: t('orders.paymentUnpaid'),
  refunded: t('orders.paymentRefunded'),
  partially_refunded: t('orders.paymentPartiallyRefunded'),
}[String(status || '').toLowerCase()] ?? t('account.notRecorded'))

const deliveryLabel = (type?: string | null) => ({
  ship: t('orders.shipToAddress'),
  pickup: t('orders.localPickup'),
}[String(type || '').toLowerCase()] ?? t('account.notRecorded'))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">
          {{ showDetails ? t('orders.detailsTitle') : t('orders.title') }}
        </h2>
        <p class="text-sm text-slate-500">
          {{ showDetails ? t('orders.detailsSubtitle') : t('orders.subtitle', { count: orders.length }) }}
        </p>
      </div>

      <button
        v-if="showDetails"
        type="button"
        class="inline-flex w-max items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        @click="emit('close-details')"
      >
        {{ t('orders.backToOrders') }}
      </button>
    </div>

    <template v-if="showDetails">
      <div v-if="detailsLoading" class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div class="space-y-3 animate-pulse">
          <div class="h-5 w-1/3 rounded bg-slate-200"></div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div v-for="i in 3" :key="i" class="h-24 rounded-lg bg-slate-100"></div>
          </div>
          <div class="h-48 rounded-lg bg-slate-100"></div>
        </div>
      </div>

      <div v-else-if="detail" class="space-y-4">
        <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('orders.order') }}</div>
              <div class="mt-1 text-2xl font-bold text-slate-900">
                {{ detailOrder?.transaction_number || detailOrder?.order_code || activeOrderId }}
              </div>
              <div class="mt-1 text-sm text-slate-500">
                {{ t('orders.placed', { date: formatDateTime(detailOrder?.created_at) }) }}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1"
                :class="statusChip(detailOrder?.status)">
                <span class="h-1.5 w-1.5 rounded-full" :class="statusDot(detailOrder?.status)" />
                {{ orderStatusLabel(detailOrder?.status) }}
              </span>
              <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {{ t('orders.itemsCount', { count: detailItems.length }) }}
              </span>
            </div>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="text-xs font-medium text-slate-500">{{ t('orders.payment') }}</div>
              <div class="mt-1 text-sm font-bold text-slate-900">{{ paymentLabel(payment?.method) }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ payment?.status || t('account.statusNotRecorded') }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="text-xs font-medium text-slate-500">{{ t('orders.fulfillment') }}</div>
              <div class="mt-1 text-sm font-bold text-slate-900">{{ deliveryLabel(deliveryType) }}</div>
              <div class="mt-1 text-xs text-slate-500">
                {{ deliveryType === 'pickup'
                  ? (detail.fulfillment.pickup?.location_name || t('orders.pickupLocation'))
                  : (detail.fulfillment.shipping?.shipper_name || t('orders.shippingCarrier')) }}
              </div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="text-xs font-medium text-slate-500">{{ t('orders.loyaltyRedeemed') }}</div>
              <div class="mt-1 text-sm font-bold text-slate-900">
                {{ detailTotals?.loyalty_points_redeemed || 0 }} pts
              </div>
              <div class="mt-1 text-xs text-slate-500">
                {{ money(detailTotals?.loyalty_discount, currency) }}
              </div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-900 p-3 text-white">
              <div class="text-xs font-medium text-white/65">{{ t('orders.grandTotal') }}</div>
              <div class="mt-1 text-lg font-bold">{{ money(detailTotals?.grand_total, currency) }}</div>
              <div class="mt-1 text-xs text-white/60">{{ t('orders.grandTotalHelp') }}</div>
            </div>
          </div>
        </section>

        <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section class="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 px-4 py-3">
              <h3 class="text-sm font-semibold text-slate-900">{{ t('orders.products') }}</h3>
            </div>

            <div class="divide-y divide-slate-100 sm:hidden">
              <article v-for="item in detailItems" :key="item.id" class="p-4">
                <div class="flex items-start gap-3">
                  <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                    <img v-if="imageSrc(item.image_path)" :src="imageSrc(item.image_path)" alt=""
                      class="h-full w-full object-contain p-1" />
                    <span v-else class="text-xs font-semibold text-slate-400">ISC</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="break-words font-semibold text-slate-900">{{ item.product_name || t('orders.product') }}</div>
                    <div class="mt-0.5 break-all text-xs text-slate-500">{{ item.product_code || t('orders.noProductCode') }}</div>
                  </div>
                </div>

                <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="text-xs text-slate-500">{{ t('orders.qty') }}</dt>
                    <dd class="mt-0.5 font-semibold text-slate-900">{{ item.quantity }}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="text-xs text-slate-500">{{ t('orders.unit') }}</dt>
                    <dd class="mt-0.5 font-semibold text-slate-900">{{ money(item.unit_price, currency) }}</dd>
                    <dd v-if="item.line_discount_amount" class="mt-0.5 text-xs text-slate-400 line-through">
                      {{ money(item.original_unit_price, currency) }}
                    </dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="text-xs text-slate-500">{{ t('orders.vat') }}</dt>
                    <dd class="mt-0.5 font-semibold text-slate-900">{{ money(item.vat, currency) }}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-900 p-2 text-white">
                    <dt class="text-xs text-white/65">{{ t('orders.subtotal') }}</dt>
                    <dd class="mt-0.5 font-bold">{{ money(item.subtotal, currency) }}</dd>
                  </div>
                  <div v-if="item.line_discount_amount" class="col-span-2 rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <dt class="text-xs">{{ t('orders.productDiscount') }}</dt>
                    <dd class="mt-0.5 font-semibold">
                      -{{ money(item.line_discount_amount, currency) }}
                      <span v-if="item.discount?.name" class="font-normal">({{ item.discount.name }})</span>
                    </dd>
                  </div>
                </dl>
              </article>

              <div v-if="!detailItems.length" class="px-4 py-10 text-center text-sm text-slate-500">
                {{ t('orders.noProducts') }}
              </div>
            </div>

            <div class="hidden overflow-x-auto sm:block">
              <table class="min-w-[680px] text-sm">
                <thead class="bg-slate-50 text-slate-600">
                  <tr>
                    <th class="px-4 py-3 text-left font-semibold">{{ t('orders.product') }}</th>
                    <th class="px-4 py-3 text-right font-semibold">{{ t('orders.qty') }}</th>
                    <th class="px-4 py-3 text-right font-semibold">{{ t('orders.unit') }}</th>
                    <th class="px-4 py-3 text-right font-semibold">{{ t('orders.vat') }}</th>
                    <th class="px-4 py-3 text-right font-semibold">{{ t('orders.subtotal') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in detailItems" :key="item.id">
                    <td class="px-4 py-3">
                      <div class="flex min-w-[260px] items-center gap-3">
                        <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                          <img v-if="imageSrc(item.image_path)" :src="imageSrc(item.image_path)" alt=""
                            class="h-full w-full object-contain p-1" />
                          <span v-else class="text-xs font-semibold text-slate-400">ISC</span>
                        </div>
                        <div class="min-w-0">
                          <div class="truncate font-semibold text-slate-900">{{ item.product_name || t('orders.product') }}</div>
                          <div class="truncate text-xs text-slate-500">{{ item.product_code || t('orders.noProductCode') }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right text-slate-700">{{ item.quantity }}</td>
                    <td class="px-4 py-3 text-right text-slate-700">
                      <div>{{ money(item.unit_price, currency) }}</div>
                      <div v-if="item.line_discount_amount" class="text-xs text-slate-400 line-through">
                        {{ money(item.original_unit_price, currency) }}
                      </div>
                      <div v-if="item.line_discount_amount" class="text-xs text-emerald-700">
                        -{{ money(item.line_discount_amount, currency) }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right text-slate-700">{{ money(item.vat, currency) }}</td>
                    <td class="px-4 py-3 text-right font-semibold text-slate-900">{{ money(item.subtotal, currency) }}</td>
                  </tr>

                  <tr v-if="!detailItems.length">
                    <td colspan="5" class="px-4 py-10 text-center text-slate-500">{{ t('orders.noProducts') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <aside class="min-w-0 space-y-4">
            <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 class="text-sm font-semibold text-slate-900">{{ t('orders.paymentDetails') }}</h3>
              <dl class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.method') }}</dt>
                  <dd class="font-semibold text-slate-900">{{ paymentLabel(payment?.method) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.paymentStatus') }}</dt>
                  <dd class="font-semibold" :class="payment?.status === 'paid' ? 'text-emerald-700' : payment?.status === 'failed' ? 'text-red-700' : 'text-amber-700'">
                    {{ paymentStatusLabel(payment?.status) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.amount') }}</dt>
                  <dd class="font-semibold text-slate-900">{{ payment?.amount != null ? money(payment?.amount, currency) : '-' }}</dd>
                </div>
                <div v-if="payment?.method === 'card'" class="border-t border-slate-100 pt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t('orders.card') }}</div>
                  <div class="mt-1 text-sm text-slate-700">
                    {{ payment.card?.brand || t('orders.card') }}
                    <span v-if="payment.card?.last4">{{ t('orders.ending', { last4: payment.card?.last4 }) }}</span>
                  </div>
                  <div v-if="payment.card?.transaction_id" class="mt-1 break-all text-xs text-slate-500">
                    {{ t('orders.transaction', { id: payment.card.transaction_id }) }}
                  </div>
                </div>
                <div v-if="payment?.method === 'transfer'" class="border-t border-slate-100 pt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t('orders.transfer') }}</div>
                  <div class="mt-1 text-sm text-slate-700">{{ payment.transfer?.reference || t('orders.referenceNotRecorded') }}</div>
                  <div v-if="payment.transfer?.payer_name" class="mt-1 text-xs text-slate-500">{{ payment.transfer.payer_name }}</div>
                </div>
                <div v-if="payment?.method === 'cod'" class="border-t border-slate-100 pt-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ t('orders.cod') }}</div>
                  <div class="mt-1 text-sm text-slate-700">
                    {{ payment.cod?.collected ? t('orders.collected') : t('orders.pendingCollection') }}
                  </div>
                </div>
              </dl>
            </section>

            <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 class="text-sm font-semibold text-slate-900">{{ t('orders.deliveryDetails') }}</h3>

              <div v-if="deliveryType === 'pickup'" class="mt-3 text-sm text-slate-700">
                <div class="font-semibold text-slate-900">{{ detail.fulfillment.pickup?.location_name || t('orders.pickupLocation') }}</div>
                <div class="mt-1 text-xs text-slate-500">{{ detail.fulfillment.pickup?.location_code || t('orders.locationCodeMissing') }}</div>
              </div>

              <div v-else class="mt-3 space-y-3 text-sm">
                <div>
                  <div class="font-semibold text-slate-900">{{ detail.fulfillment.shipping?.shipper_name || t('orders.carrierMissing') }}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ t('orders.basis') }}: {{ detail.fulfillment.shipping?.basis || '-' }}
                    <span v-if="detail.fulfillment.shipping?.weight_kg"> / {{ detail.fulfillment.shipping?.weight_kg }} kg</span>
                    <span v-if="detail.fulfillment.shipping?.volume_cbm"> / {{ detail.fulfillment.shipping?.volume_cbm }} CBM</span>
                  </div>
                </div>

                <div v-if="detail.fulfillment.shipping?.address" class="rounded-lg bg-slate-50 p-3 text-slate-700">
                  <div class="font-semibold text-slate-900">{{ [detail.fulfillment.shipping.address.title || detail.fulfillment.shipping.address.designation, detail.fulfillment.shipping.address.contact_name].filter(Boolean).join(' ') || t('orders.shippingContact') }}</div>
                  <div class="mt-1">{{ [
                    detail.fulfillment.shipping.address.country,
                    detail.fulfillment.shipping.address.region,
                    detail.fulfillment.shipping.address.district,
                    detail.fulfillment.shipping.address.city,
                  ].filter(Boolean).join(' / ') || t('orders.addressMissing') }}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ detail.fulfillment.shipping.address.phone || '' }}
                    <span v-if="detail.fulfillment.shipping.address.email"> / {{ detail.fulfillment.shipping.address.email }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 class="text-sm font-semibold text-slate-900">{{ t('orders.paymentBreakdown') }}</h3>
              <dl class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.itemsBeforeDiscount') }}</dt>
                  <dd class="font-medium text-slate-900">{{ money(detailTotals?.original_subtotal, currency) }}</dd>
                </div>
                <div v-if="Number(detailTotals?.product_discount || 0) > 0" class="flex justify-between gap-3 text-emerald-700">
                  <dt>{{ t('orders.productDiscount') }}</dt>
                  <dd class="font-medium">-{{ money(detailTotals?.product_discount, currency) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.itemsSubtotal') }}</dt>
                  <dd class="font-medium text-slate-900">{{ money(detailTotals?.subtotal, currency) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.vat') }}</dt>
                  <dd class="font-medium text-slate-900">{{ money(detailTotals?.vat, currency) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.shipping') }}</dt>
                  <dd class="font-medium text-slate-900">{{ money(detailTotals?.shipping, currency) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">{{ t('orders.beforeLoyalty') }}</dt>
                  <dd class="font-medium text-slate-900">{{ money(detailTotals?.before_loyalty, currency) }}</dd>
                </div>
                <div class="flex justify-between gap-3 text-emerald-700">
                  <dt>{{ t('orders.loyaltyDiscount') }}</dt>
                  <dd class="font-medium">-{{ money(detailTotals?.loyalty_discount, currency) }}</dd>
                </div>
                <div class="border-t border-slate-200 pt-2">
                  <div class="flex justify-between gap-3 text-base">
                    <dt class="font-semibold text-slate-900">{{ t('orders.grandTotal') }}</dt>
                    <dd class="font-bold text-slate-900">{{ money(detailTotals?.grand_total, currency) }}</dd>
                  </div>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>

      <div v-else class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        {{ t('orders.noDetails') }}
      </div>
    </template>

    <template v-else>
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div class="flex-1">
            <label class="mb-1 block text-xs font-medium text-slate-600">{{ t('orders.searchOrder') }}</label>
            <input v-model.trim="filters.q" type="text" :placeholder="t('orders.searchPlaceholder')"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">{{ t('orders.from') }}</label>
            <input v-model="filters.from" type="date"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">{{ t('orders.to') }}</label>
            <input v-model="filters.to" type="date"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">{{ t('orders.status') }}</label>
            <select v-model="filters.status"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="">{{ t('orders.all') }}</option>
              <option value="pending">{{ t('account.status.pending') }}</option>
              <option value="processing">{{ t('account.status.processing') }}</option>
              <option value="packed">{{ t('account.status.packed') }}</option>
              <option value="dispatched">{{ t('account.status.dispatched') }}</option>
              <option value="shipped">{{ t('account.status.shipped') }}</option>
              <option value="ready_for_collection">{{ t('account.status.ready_for_collection') }}</option>
              <option value="delivered">{{ t('account.status.delivered') }}</option>
              <option value="cancelled">{{ t('account.status.cancelled') }}</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button type="button" class="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700"
              @click="applyFilters">
              {{ t('orders.apply') }}
            </button>
            <button type="button" class="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
              @click="clearFilters">
              {{ t('orders.clear') }}
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <div class="text-sm font-semibold text-slate-700">{{ t('orders.orderHistory') }}</div>
        </div>

        <div v-if="loading" class="divide-y divide-slate-100">
          <div v-for="i in 4" :key="i" class="px-4 py-4 animate-pulse">
            <div class="mb-2 h-4 w-1/3 rounded bg-slate-200"></div>
            <div class="h-3 w-2/3 rounded bg-slate-200"></div>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">{{ t('orders.orderNumber') }}</th>
                <th class="px-4 py-3 text-left font-semibold">{{ t('orders.date') }}</th>
                <th class="px-4 py-3 text-left font-semibold">{{ t('orders.status') }}</th>
                <th class="px-4 py-3 text-left font-semibold">{{ t('orders.delivery') }}</th>
                <th class="px-4 py-3 text-right font-semibold">{{ t('orders.total') }}</th>
                <th class="px-4 py-3 text-right font-semibold">{{ t('orders.actions') }}</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <tr v-for="order in orders" :key="order.id" class="cursor-pointer transition hover:bg-slate-50"
                @click="onRowClick(order.id)">
                <td class="px-4 py-3 font-semibold text-slate-900">{{ order.Transaction_Number }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatDate(order.created_at) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ring-1"
                    :class="statusChip(order.Status)" @click.stop="openTracking(order)">
                    <span class="h-1.5 w-1.5 rounded-full" :class="statusDot(order.Status)" />
                    {{ orderStatusLabel(order.Status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-700">{{ deliveryLabel(order.Delivery_Type) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-slate-900">{{ money(order.Total_Price, 'OMR') }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                    @click.stop="openDetails(order.id)">
                    {{ t('orders.viewDetails') }}
                  </button>
                </td>
              </tr>

              <tr v-if="!orders || orders.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-slate-500">
                  {{ t('orders.empty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="pagination" class="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-xs text-slate-600">
            <span v-if="pagination.from && pagination.to">
              {{ t('orders.showingRange', { from: pagination.from, to: pagination.to, total: pagination.total }) }}
            </span>
            <span v-else>{{ t('orders.totalRows', { total: pagination.total }) }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select :value="pagination.per_page"
              class="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm"
              :disabled="loading"
              @change="emit('per-page-change', Number(($event.target as HTMLSelectElement).value))">
              <option :value="10">{{ t('orders.perPage', { count: 10 }) }}</option>
              <option :value="20">{{ t('orders.perPage', { count: 20 }) }}</option>
              <option :value="50">{{ t('orders.perPage', { count: 50 }) }}</option>
            </select>
            <button class="rounded-lg px-3 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              :disabled="loading || pagination.current_page <= 1" @click="emit('page-change', 1)">{{ t('orders.first') }}</button>
            <button class="rounded-lg px-3 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              :disabled="loading || pagination.current_page <= 1" @click="emit('page-change', pagination.current_page - 1)">{{ t('orders.prev') }}</button>
            <span class="px-2 text-xs text-slate-600">
              {{ t('orders.page', { page: pagination.current_page, last: pagination.last_page }) }}
            </span>
            <button class="rounded-lg px-3 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              :disabled="loading || pagination.current_page >= pagination.last_page" @click="emit('page-change', pagination.current_page + 1)">{{ t('orders.next') }}</button>
            <button class="rounded-lg px-3 py-1.5 text-xs ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              :disabled="loading || pagination.current_page >= pagination.last_page" @click="emit('page-change', pagination.last_page)">{{ t('orders.last') }}</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showTrackModal" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeTracking"></div>

      <div class="relative mx-auto mt-[8vh] w-[min(900px,95vw)] overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5">
        <div class="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div>
            <div class="text-xs uppercase tracking-wide text-white/60">{{ t('orders.tracking') }}</div>
            <div class="font-semibold">{{ trackingOrder?.Transaction_Number }}</div>
          </div>
          <button class="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" @click="closeTracking">
            {{ t('common.close') }}
          </button>
        </div>

        <div class="grid gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm md:grid-cols-3">
          <div>
            <span class="text-slate-500">{{ t('orders.fulfillment') }}:</span>
            <span class="font-medium text-slate-800">
              {{ trackingOrder?.Delivery_Type === 'pickup' ? t('orders.localPickup') : (trackingOrder?.Carrier || '-') }}
            </span>
          </div>
          <div><span class="text-slate-500">{{ t('orders.status') }}:</span> <span class="font-medium text-slate-800">{{ orderStatusLabel(trackingOrder?.Status) }}</span></div>
          <div>
            <span class="text-slate-500">{{ trackingOrder?.Delivery_Type === 'pickup' ? t('orders.collection') : t('orders.expected') }}</span>
            <span class="font-medium text-slate-800">
              {{ trackingOrder?.Delivery_Type === 'pickup' ? t('orders.waitReady') : (trackingOrder?.Expected_Date || '-') }}
            </span>
          </div>
        </div>

        <div class="px-5 py-8">
          <ol class="flex items-center">
            <li v-for="(step, idx) in currentTrackSteps" :key="step" class="flex w-full items-center">
              <div class="flex w-20 flex-col items-center text-center">
                <div class="grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-colors"
                  :class="idx <= activeStepIndex ? 'bg-cyan-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-300'">
                  {{ idx + 1 }}
                </div>
                <div class="mt-2 text-[11px] font-medium leading-tight"
                  :class="idx <= activeStepIndex ? 'text-slate-900' : 'text-slate-500'">
                  {{ stepLabel(step) }}
                </div>
              </div>
              <div v-if="idx < currentTrackSteps.length - 1" class="mx-2 h-0.5 flex-1 rounded-full"
                :class="idx < activeStepIndex ? 'bg-cyan-500' : 'bg-slate-200'"></div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
