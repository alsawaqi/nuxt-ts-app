<script setup lang="ts">
const { $r2Url, $axios } = useNuxtApp()
const { user, customer, isAuthenticated } = useAuth()
const { t, field } = useStorefrontLocale()
import { ref, onMounted } from 'vue'


type Party = {
  name: string
  lines: string[]   // address lines
}

type PickupLocation = {
  id: number
  name: string
  nameAr?: string
}
type Contact = {
  label: string
  name: string
  phone?: string
  tel?: string
  email?: string
}
type Item = {
  sl: number
  description: string
  qty: number | string
  unit: string
  unitPrice: number
  totalExcl: number
  vatPct: number
  vatAmt: number
  totalIncl: number
}

type ShippingOption = {
  shipper_id: number
  destination_id: number
  basis: string
  currency: string
  total_price: number
  breakdown: any[],
  deliverymethod: string

}

const delivery = ref<any>([])


 

const props = defineProps<{
  deliveryMethod: 'ship' | 'pickup'
  pickupLocationId?: number | null
  pickupLocation?: PickupLocation | null
  shipping?: ShippingOption | null

  orderRef?: string
  invoiceDate?: string
  supplier: Party
  buyer: Party

  supplierContact?: Contact
  buyerContact?: Contact

  paymentTerms?: string
  currency?: string
  supplierTin?: string
  buyerVatin?: string
  supplierDoRef?: string
  buyerPoRef?: string
  deliveryTerms?: string

  bank?: {
    accountName: string
    accountNumber: string
    currency: string
    swift: string
    bankName: string
    bankAddress: string
  } | null

  items: Item[]
  totals: { taxable: number; vat: number; grand: number; originalSubtotal?: number; productDiscount?: number }
  onConfirm?: () => void
}>()


const fmt = (n: any) => {
  const num = Number(n)
  return isNaN(num) ? '0.000' : num.toFixed(3)
}


const pickupLoc = ref<any>(null)

const getPickupLocation = async () => {
  if (props.deliveryMethod !== 'pickup') return
  if (!props.pickupLocationId) return

  const { data } = await $axios.get('/api/locations')
  pickupLoc.value = (data || []).find((x: any) => x.id === props.pickupLocationId) || null
}


 

const getdeliveryinfo = async () => {
  if (props.deliveryMethod !== 'ship') return
  if (!props.shipping?.shipper_id) return

  try {
    const { data: res } = await $axios.get('/api/shipping/getshippers', {
      params: { shipping_id: props.shipping.shipper_id }
    })

    const d = res?.data
    delivery.value = Array.isArray(d) ? (d[0] ?? null) : (d ?? null)
  } catch (error) {
    console.error('Error fetching shippers:', error)
  }
}



onMounted(async () => {
  await getdeliveryinfo();
   await getPickupLocation()
})
</script>

<template>
  <section class="max-w-screen-xl mx-auto px-4 py-6 sm:py-8 bg-white">
    <!-- Header band -->
    <div class="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800">{{ t('confirm.title') }}</h2>
        <div class="mt-0.5 text-sm text-slate-600">
          {{ t('confirm.review') }}
        </div>
      </div>
     
    </div>

    <!-- Top 2x2 grid: Supplier/Buyer + Contacts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      <!-- Supplier -->
      <div class="rounded-lg ring-1 ring-slate-200 bg-white">
        <div class="px-4 py-2 border-b border-slate-200">
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">{{ t('confirm.supplier') }}</h3>
        </div>
        <div class="px-4 py-3 text-sm">
          <div class="font-semibold text-slate-900">{{ supplier.name }}</div>
          <div class="mt-1 text-slate-700 leading-relaxed">
            <div v-for="(l, i) in supplier.lines" :key="i">{{ l }}</div>
          </div>
        </div>
      </div>

      <!-- Buyer -->
      <div class="rounded-lg ring-1 ring-slate-200 bg-white">
        <div class="px-4 py-2 border-b border-slate-200">
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">{{ t('confirm.buyer') }}</h3>
        </div>
        <div class="px-4 py-3 text-sm">
          <div class="font-semibold text-slate-900">{{ customer?.Customer_Full_Name }}</div>
          <div class="mt-1 text-slate-700 leading-relaxed">
            <div v-for="(l, i) in buyer.lines" :key="i">{{ l }}</div>
          </div>
        </div>
      </div>

      <!-- Supplier Contact -->
    <div class="rounded-lg ring-1 ring-slate-200 bg-white">
  <div class="px-4 py-2 border-b border-slate-200">
    <h3 class="text-sm font-semibold tracking-wide text-slate-700">{{ t('confirm.deliveryInfo') }}</h3>
  </div>

  <div class="px-4 py-3 text-sm text-slate-700">
    <template v-if="props.deliveryMethod === 'ship'">
      <div>{{ t('confirm.deliveryType') }}: {{ t('confirm.shipping') }}</div>
      <div>{{ t('confirm.deliveryName') }}: {{ delivery?.Shippers_Name || props.shipping?.deliverymethod || '—' }}</div>
      <div v-if="props.shipping?.basis">{{ t('confirm.basis') }}: {{ props.shipping.basis }}</div>
    </template>

    <template v-else>
      <div>{{ t('confirm.deliveryType') }}: {{ t('cart.localPickup') }}</div>
      <div>{{ t('confirm.pickupLocation') }}: {{ field(pickupLoc, 'Location_Name') || props.pickupLocation?.name || '—' }}</div>

      <!-- or pickupLoc?.Location_Name if you fetched -->
    </template>
  </div>
</div>

     
    </div>


    <!-- Items table -->
    <div class="mt-6 overflow-hidden rounded-lg ring-1 ring-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr class="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th class="w-16">{{ t('confirm.slNo') }}</th>
              <th>{{ t('confirm.description') }}</th>
              <th class="w-24">{{ t('cart.qty') }}</th>
              <th class="w-28 text-right">{{ t('confirm.unitPrice') }}</th>

              <th class="w-36 text-right">{{ t('confirm.totalInclVat') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in items" :key="row.sl" class="[&>td]:px-3 [&>td]:py-2.5">
              <td class="text-slate-700">{{ String(row.sl).padStart(2, '0') }}</td>
              <td class="text-slate-800">
                <div class="whitespace-pre-line leading-relaxed">{{ row.description }}</div>
              </td>
              <td class="text-slate-700">{{ row.qty }}</td>
              <td class="text-right tabular-nums">{{ fmt(row.unitPrice) }}</td>

              <td class="text-right font-semibold text-slate-900 tabular-nums">{{ fmt(row.totalIncl) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals footer -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 p-4 text-sm">
        <div class="sm:col-span-2"></div>
        <div class="space-y-1">
          <div v-if="Number(totals.productDiscount || 0) > 0" class="flex justify-between">
            <span class="text-slate-600">{{ t('cart.itemsBeforeDiscount') }}:</span>
            <span class="font-medium text-slate-900">{{ fmt(totals.originalSubtotal) }} {{ t('common.omr') }}</span>
          </div>
          <div v-if="Number(totals.productDiscount || 0) > 0" class="flex justify-between text-emerald-700">
            <span>{{ t('cart.productDiscount') }}:</span>
            <span class="font-medium">-{{ fmt(totals.productDiscount) }} {{ t('common.omr') }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">{{ t('confirm.amount') }}:</span>
            <span class="font-medium text-slate-900">{{ fmt(totals.taxable) }} {{ t('common.omr') }}</span>
          </div>

         <div class="flex justify-between">
  <span class="text-slate-600">
    {{ props.deliveryMethod === 'ship' ? t('cart.delivery') : t('confirm.pickup') }}:
  </span>
  <span class="font-medium text-slate-900">
    {{ props.deliveryMethod === 'ship' ? fmt(props.shipping?.total_price) : '0.000' }} {{ t('common.omr') }}
  </span>
</div>
          <div class="flex justify-between">
            <span class="text-slate-600">{{ t('confirm.vatAmount') }}:</span>
            <span class="font-medium text-slate-900">{{ fmt(totals.vat) }} {{ t('common.omr') }}</span>
          </div>
          <div class="flex justify-between border-t pt-2 mt-1">
            <span class="font-semibold text-slate-800">{{ t('confirm.totalNet') }}:</span>
            <span class="font-bold text-emerald-700">{{ fmt(totals.grand) }} {{ t('common.omr') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action row -->
    <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="text-xs text-slate-500">
        {{ t('confirm.customerConfirmation') }}
      </div>
      <button @click="onConfirm?.()" class="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white
               bg-[#2f5fb6] hover:bg-[#274f97] transition">
        {{ t('confirm.continuePayment') }}
      </button>
    </div>
  </section>
</template>
