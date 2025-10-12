<!-- OrderConfirm.vue (or paste inside checkout.vue when step==='confirm') -->
<script setup lang="ts">
type Party = {
  name: string
  lines: string[]   // address lines
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
  qty: number|string
  unit: string
  unitPrice: number
  totalExcl: number
  vatPct: number
  vatAmt: number
  totalIncl: number
}
const props = defineProps<{
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
  totals: {
    taxable: number
    vat: number
    grand: number
  }
  onConfirm?: () => void
}>()

const fmt = (n: any) => {
  const num = Number(n)
  return isNaN(num) ? '0.000' : num.toFixed(3)
}
</script>

<template>
  <section class="max-w-screen-xl mx-auto px-4 py-6 sm:py-8 bg-white">
    <!-- Header band -->
    <div class="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between mb-4">
      
    </div>

    <!-- Top 2x2 grid: Supplier/Buyer + Contacts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      <!-- Supplier -->
      <div class="rounded-lg ring-1 ring-slate-200 bg-white">
        <div class="px-4 py-2 border-b border-slate-200">
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">SUPPLIER</h3>
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
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">BUYER</h3>
        </div>
        <div class="px-4 py-3 text-sm">
          <div class="font-semibold text-slate-900">{{ buyer.name }}</div>
          <div class="mt-1 text-slate-700 leading-relaxed">
            <div v-for="(l, i) in buyer.lines" :key="i">{{ l }}</div>
          </div>
        </div>
      </div>

      <!-- Supplier Contact -->
      <!-- <div class="rounded-lg ring-1 ring-slate-200 bg-white">
        <div class="px-4 py-2 border-b border-slate-200">
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">SUPPLIER CONTACT</h3>
        </div>
        <div class="px-4 py-3 text-sm text-slate-700">
          <div class="font-medium">{{ supplierContact?.name }}</div>
          <div v-if="supplierContact?.phone">Mob: {{ supplierContact?.phone }}</div>
          <div v-if="supplierContact?.tel">Tel: {{ supplierContact?.tel }}</div>
          <div v-if="supplierContact?.email">E-mail: {{ supplierContact?.email }}</div>
        </div>
      </div> -->

      <!-- Buyer Contact -->
      <!-- <div class="rounded-lg ring-1 ring-slate-200 bg-white">
        <div class="px-4 py-2 border-b border-slate-200">
          <h3 class="text-sm font-semibold tracking-wide text-slate-700">BUYER CONTACT</h3>
        </div>
        <div class="px-4 py-3 text-sm text-slate-700">
          <div class="font-medium">{{ buyerContact?.name }}</div>
          <div v-if="buyerContact?.phone">Mob: {{ buyerContact?.phone }}</div>
          <div v-if="buyerContact?.email">Email: {{ buyerContact?.email }}</div>
        </div>
      </div> -->
    </div>

    <!-- Meta band -->
    <!-- <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-4">
      <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm">
        <div class="text-slate-500">ACCEPTED TERMS OF PAYMENT</div>
        <div class="font-semibold text-slate-800 mt-1">{{ paymentTerms || '—' }}</div>
      </div>
      <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm">
        <div class="text-slate-500">ACCEPTED INVOICE CURRENCY</div>
        <div class="font-semibold text-slate-800 mt-1">{{ currency || 'OMR' }}</div>
      </div>
      <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm">
        <div class="grid grid-cols-2 gap-x-4">
          <div>
            <div class="text-slate-500">Supplier TIN</div>
            <div class="font-semibold text-slate-800 mt-1">{{ supplierTin || '—' }}</div>
          </div>
          <div>
            <div class="text-slate-500">Buyer VATIN</div>
            <div class="font-semibold text-slate-800 mt-1">{{ buyerVatin || '—' }}</div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- Refs row -->
    <!-- <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mt-4">
      <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm">
        <div class="text-slate-500">Supplier DO Ref</div>
        <div class="font-medium text-slate-800 mt-0.5">{{ supplierDoRef || '—' }}</div>
      </div>
      <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm">
        <div class="text-slate-500">Buyer PO Ref</div>
        <div class="font-medium text-slate-800 mt-0.5">{{ buyerPoRef || '—' }}</div>
      </div>
    </div> -->

    <!-- Terms -->
    <!-- <div class="rounded-lg ring-1 ring-slate-200 bg-white px-4 py-3 text-sm mt-4">
      <div class="font-semibold text-slate-800 mb-1">Terms &amp; Conditions</div>
      <ol class="list-decimal ml-5 space-y-1 text-slate-700">
        <li v-if="deliveryTerms"><span class="font-medium">Delivery Terms:</span> {{ deliveryTerms }}</li>
        <li v-if="bank" class="space-y-0.5">
          <div class="font-medium">Bank Account Details for Payment:</div>
          <div>Account Name: {{ bank.accountName }}</div>
          <div>Account Number: {{ bank.accountNumber }}</div>
          <div>Account Currency: {{ bank.currency }}</div>
          <div>SWIFT Code: {{ bank.swift }}</div>
          <div>Bank Name: {{ bank.bankName }}</div>
          <div>Bank Address: {{ bank.bankAddress }}</div>
        </li>
      </ol>
    </div> -->

    <!-- Items table -->
    <div class="mt-6 overflow-hidden rounded-lg ring-1 ring-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr class="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th class="w-16">SL No</th>
              <th>Description</th>
              <th class="w-24">QTY</th>
              <th class="w-28 text-right">Unit Price</th>
              <th class="w-32 text-right">Total excl. VAT</th>
              <th class="w-20 text-right">VAT %</th>
              <th class="w-28 text-right">VAT Amt</th>
              <th class="w-36 text-right">Total incl VAT</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in items" :key="row.sl" class="[&>td]:px-3 [&>td]:py-2.5">
              <td class="text-slate-700">{{ String(row.sl).padStart(2, '0') }}</td>
              <td class="text-slate-800">
                <div class="whitespace-pre-line leading-relaxed">{{ row.description }}</div>
              </td>
              <td class="text-slate-700">{{ row.qty }} {{ row.unit }}</td>
              <td class="text-right tabular-nums">{{ fmt(row.unitPrice) }}</td>
              <td class="text-right tabular-nums">{{ fmt(row.totalExcl) }}</td>
              <td class="text-right tabular-nums">{{ row.vatPct }}%</td>
              <td class="text-right tabular-nums">{{ fmt(row.vatAmt) }}</td>
              <td class="text-right font-semibold text-slate-900 tabular-nums">{{ fmt(row.totalIncl) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals footer -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200 p-4 text-sm">
        <div class="sm:col-span-2"></div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-600">Taxable Amount:</span>
            <span class="font-medium text-slate-900">{{ fmt(totals.taxable) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">VAT Amount:</span>
            <span class="font-medium text-slate-900">{{ fmt(totals.vat) }}</span>
          </div>
          <div class="flex justify-between border-t pt-2 mt-1">
            <span class="font-semibold text-slate-800">Total Net Amount (Incl. VAT):</span>
            <span class="font-bold text-emerald-700">{{ fmt(totals.grand) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action row -->
    <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="text-xs text-slate-500">
        Industrial Supplies Center LLC — Customer Confirmation
      </div>
      <button
        @click="onConfirm?.()"
        class="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white
               bg-[#2f5fb6] hover:bg-[#274f97] transition"
      >
        Confirm & Continue to Payment
      </button>
    </div>
  </section>
</template>
