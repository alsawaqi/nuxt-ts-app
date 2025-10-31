<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  middleware: 'auth',
})

import { useCartStore } from '~/stores/cart'
import { ref, onMounted, computed, watch } from 'vue'
import { useOrderConfirmPdf } from '@/composables/useOrderConfirmPdf'

// import { useToast } from 'vue-toastification'

const { user, isAuthenticated } = useAuth()
const { $axios, $r2Url } = useNuxtApp()

const step = ref<'confirm' | 'payment'>('confirm')

const { buildPdfUrl } = useOrderConfirmPdf()

const pdfUrl = ref<string>('')

// ---------------------
// Types
// ---------------------
type Basis = 'weight' | 'volume' | 'heavy'
interface SavedShippingOption {
  shipper_id: number
  destination_id: number
  basis: Basis
  currency: string
  total_price: number
  breakdown?: any | null
}
interface SavedCheckoutPrefill {
  orderRef?: string
  deliveryMethod: 'ship' | 'pickup'
  addressId: number | null
  shippingOption: SavedShippingOption | null
  totals: {
    currency: string
    subtotal: number
    shipping: number
    vat: number
    grand: number
  }
  items: { id: number; slug?: string; qty: number; price: number }[]
  savedAt: string
}

// ---------------------
// State
// ---------------------
const cart = useCartStore()
//const toast = useToast()

const isSubmitting = ref(false)
const isSuccess = ref(false)
const itemsOpen = ref(false)

const selectedAddress = ref<any>(null)
const saved = ref<SavedCheckoutPrefill | null>(null)


const confirmOrder = () => {
  step.value = 'payment'
}


const shippingAddressText = computed(() => {
  const a = selectedAddress.value
  return a
    ? `${a?.Contact_Person_Name || ''}\n${a?.Telephone || ''}\n` +
      `${a?.country?.Country_Name || ''}, ${a?.region?.Region_Name || ''}, ` +
      `${a?.district?.District_Name || ''}, ${a?.city?.City_Name || ''}`
    : '—'
})

const linesForPdf = () =>
  cart.cartItems.map((i, idx) => ({
    description: `${i.name}\nSKU: ${i.slug || i.id}`,
    qty: Number(i.quantity || 0),
    unit: 'EA',
    unitPrice: Number(i.price || 0),
    vatPct: 5,
  }))

// ---------------------
// Payment state
// ---------------------
type Brand = 'visa' | 'mastercard' | 'amex' | 'unknown'
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')
const detectBrand = (num: string): Brand => {
  const s = onlyDigits(num)
  if (/^4\d{0,15}$/.test(s)) return 'visa'
  if (/^(5[1-5]\d{0,14}|2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{0,12})$/.test(s)) return 'mastercard'
  if (/^3[47]\d{0,13}$/.test(s)) return 'amex'
  return 'unknown'
}
const formatNumber = (raw: string): string => {
  const s = onlyDigits(raw)
  const b = detectBrand(s)
  return b === 'amex'
    ? s.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '))
    : s.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}
const MAX_DIGITS = 16
const onCardNumberInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
  const formatted = formatNumber(digits)
  if (el.value !== formatted) el.value = formatted
  card.value.number = formatted
  requestAnimationFrame(() => el.setSelectionRange(formatted.length, formatted.length))
}
const formatExpiry = (raw: string) => {
  let d = raw.replace(/\D/g, '').slice(0, 4)
  if (d.length >= 1 && parseInt(d.charAt(0), 10) > 1) d = ('0' + d).slice(0, 4)
  let mm = d.slice(0, 2)
  let yy = d.slice(2, 4)
  if (mm.length === 2) {
    const m = parseInt(mm, 10)
    if (m === 0) mm = '01'
    else if (m > 12) mm = '12'
  }
  return yy ? `${mm}/${yy}` : (d.length > 2 ? `${mm}/` : mm)
}
const onExpiryInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const formatted = formatExpiry(el.value)
  if (el.value !== formatted) el.value = formatted
  card.value.expiry = formatted
}





const paymentMethod = ref<'card' | 'cod' | 'transfer'>('card')
const triedSubmit = ref(false)
const card = ref({ number: '', name: '', expiry: '', cvc: '' })
const focusedBack = ref(false)
const transfer = ref({ reference: '', payerName: '' })
const transferValid = computed(() => Boolean(transfer.value.reference.trim() && transfer.value.payerName.trim()))
const luhn = (num: string) => {
  const s = (num || '').replace(/\D/g, '')
  if (!s) return false
  let sum = 0, dbl = false
  for (let i = s.length - 1; i >= 0; i--) {
    const char = s[i] ?? '0'
    let d = parseInt(char, 10)
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d; dbl = !dbl
  }
  return sum % 10 === 0
}
const brand = computed<Brand>(() => detectBrand(card.value.number))
const maskedNumber = computed(() => (formatNumber(card.value.number) || '•••• •••• •••• ••••').replace(/\d(?=\d{4})/g, '•'))
const nameDisplay = computed(() => (card.value.name || 'FULL NAME').toUpperCase().slice(0, 26))
const expiryDisplay = computed(() => card.value.expiry || 'MM/YY')
const cardValid = computed(() => {
  const numberStripped = card.value.number.replace(/\s+/g, '')
  const numberOk = numberStripped.length >= 13 && luhn(numberStripped)
  const nameOk = card.value.name.trim().length >= 3
  const expOk = /^((0[1-9])|(1[0-2]))\/\d{2}$/.test(card.value.expiry)
  const cvcOk = /^\d{3,4}$/.test(card.value.cvc)
  return numberOk && nameOk && expOk && cvcOk
})

// ---------------------
// Load saved prefill + address
// ---------------------
const fetchSelectedAddress = async (addressId: number | null) => {
  if (cart.deliveryMethod !== 'ship' || !addressId) return
  try {
    const res = await $axios.get(`/api/contacts/${addressId}`)
    selectedAddress.value = res.data
  } catch (error) {
    console.error('Failed to fetch selected address:', error)
  }
}

onMounted(async () => {
  try {
    const raw = localStorage.getItem('checkout_prefill')
    saved.value = raw ? JSON.parse(raw) as SavedCheckoutPrefill : null
  } catch {
    saved.value = null
  }

  if (!saved.value) {
    // nothing persisted, bounce back to cart
    return navigateTo('/cart')
  }

  console.log('Loaded saved checkout prefill:', saved.value?.shippingOption?.shipper_id)

  // sync cart method/addr for consistency
  cart.deliveryMethod = saved.value.deliveryMethod
  if (saved.value.addressId) cart.selectedAddressId = saved.value.addressId

  // If shipping required but no saved option, back to cart
  if (saved.value.deliveryMethod === 'ship' && !saved.value.shippingOption) {
    return navigateTo('/cart')
  }

  await fetchSelectedAddress(saved.value.addressId ?? null)
})

// ---------------------
// Totals (from saved blob; fallback to runtime if needed)
// ---------------------
const savedSubtotal = computed(() => Number(saved.value?.totals?.subtotal ?? cart.totalPrice().toFixed(3)))
const savedShippingCost = computed(() => Number(saved.value?.totals?.shipping ?? 0))
const savedVat = computed(() => Number(saved.value?.totals?.vat ?? ((savedSubtotal.value + savedShippingCost.value) * 0.05)))
const savedGrand = computed(() => Number(saved.value?.totals?.grand ?? (savedSubtotal.value + savedShippingCost.value + savedVat.value)))

// For enabling the button (no shipping UI here; we trust saved)

const shippingOk = computed(() => {
  return cart.deliveryMethod === 'pickup' || (saved.value?.addressId && saved.value?.shippingOption)
})
const paymentOk = computed(() => {
  if (paymentMethod.value === 'card') return cardValid.value
  if (paymentMethod.value === 'transfer') return transferValid.value
  if (paymentMethod.value === 'cod') return true
  return false
})


const canSubmit = computed(() => shippingOk.value && paymentOk.value)

// ---------------------
// Qty handlers (unchanged)
// ---------------------
const incrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item) item.quantity++
}
const decrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item && item.quantity > 1) item.quantity--
}
const onQtyInputChange = (event: Event, id: number) => {
  const value = parseInt((event.target as HTMLInputElement).value)
  const item = cart.cartItems.find(i => i.id === id)
  if (!item) return
  item.quantity = isNaN(value) || value < 1 ? 1 : value
}

// Keep address in sync if method flips
watch(() => cart.deliveryMethod, (val) => {
  if (val !== 'ship') selectedAddress.value = null
  else fetchSelectedAddress(saved.value?.addressId ?? null)
})

// ---------------------
// Submit
// ---------------------
const submitOrder = async () => {
  if (cart.cartItems.length === 0 || isSubmitting.value) return
  if (!canSubmit.value) {
    triedSubmit.value = true
    return
  }

  isSubmitting.value = true

  try {

    
    const parseExp = (mmYY: string) => {
      const m = Number(mmYY.slice(0, 2)) || null
      const y = Number(mmYY.slice(3, 5))
      const year = isNaN(y) ? null : 2000 + y
      return { m, year }
    }
    const { m: exp_month, year: exp_year } = parseExp(card.value.expiry)

    const payment = {
      method: paymentMethod.value,
      currency: 'OMR',
      amount: Number(savedGrand.value.toFixed(3)),
      card: paymentMethod.value === 'card' ? {
        brand: brand.value,
        last4: onlyDigits(card.value.number).slice(-4),
        exp_month, exp_year
      } : null,
      transfer: paymentMethod.value === 'transfer' ? {
        reference: transfer.value.reference,
        payer_name: transfer.value.payerName
      } : null
    }

    const payload = {
 
      delivery_method: cart.deliveryMethod,
      shipping_cost: savedShippingCost.value,
      Customers_Contacts_Id: cart.deliveryMethod === 'ship' ? (saved.value?.addressId ?? null) : null,
      VAT: savedVat.value,


      shipping_option: cart.deliveryMethod === 'ship' && saved.value?.shippingOption ? {
        shipper_id: saved.value.shippingOption.shipper_id,
        destination_id: saved.value.shippingOption.destination_id,
        basis: saved.value.shippingOption.basis,
        price: Number(saved.value.shippingOption.total_price),
        currency: saved.value.shippingOption.currency ?? 'OMR',
        // Optional: include any server totals you persisted
        // weight_kg: saved.value.totalsFromServer?.weight_kg,
        // volume_cbm: saved.value.totalsFromServer?.volume_cbm,
      } : null,
     
      total: {
        currency: 'OMR',
        subtotal: Number(savedSubtotal.value.toFixed(3)),
        shipping: Number(savedShippingCost.value.toFixed(3)),
        vat: Number(savedVat.value.toFixed(3)),
        grand: Number(savedGrand.value.toFixed(3))
      },
     

      cart_items: cart.cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        vat: 0,
      })),
      payment
    }

    const response = await $axios.post('/api/orders/place', payload, { withCredentials: true })

      console.log('Order response:', response.data)

    if (response.status === 200) {
  // 1) Build PDF *before* clearing the cart so item names/qtys appear
  try {
    pdfUrl.value = await buildPdfUrl({
      saved: saved.value!, // uses your persisted totals/currency
      company: {
        name: 'Industrial Supplies Center LLC',
        address: 'PO BOX 39, M.C.C., PC: 101 101, Way No: 7715\nMabelah, Sanaiya, Muscat, Oman',
        phone: '+968 24460320',
        vat: 'OM1100033153'
      },
      buyer: {
        name: user?.value?.Company_Name || 'Customer',
        address: shippingAddressText.value
      },
      supplierContact: { name: 'Sales Team', phone: '+968 93219447', email: 'motorsales@isc-depot.com' },
      buyerContact: selectedAddress.value
        ? { name: selectedAddress.value.Contact_Person_Name, phone: selectedAddress.value.Telephone, email: user?.value?.Email }
        : undefined,
      meta: {
        title: 'ORDER CONFIRMATION',
        ref: saved.value?.orderRef || `ISC-OC-${new Date().toISOString().slice(2,10).replace(/-/g,'')}`,
        date: new Date().toLocaleDateString(),
        terms: ['Delivery Terms: DDP Muscat'],
        bank: {
          accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
          accountNo: '1074-0105031-001',
          currency: saved.value?.totals?.currency || 'OMR',
          swift: 'NBOMOMRXXXX',
          bank: 'National Bank of Oman',
          branch: 'Corporate Branch, PO Box 751, PC:112, Ruwi, Muscat, Oman',
          iban: 'OMxx 0000 0000 0000 0000'
        }
      },
      // Use cart items *now* (they’ll be cleared right after)
      lines: linesForPdf()
    })
  } catch (e) {
    console.error('PDF build failed:', e)
    pdfUrl.value = '' // fallback
  }

  // 2) Now clean up the cart/localStorage
  cart.clearCart()
  localStorage.removeItem('checkout_prefill')

  // 3) Show success section (which includes the PDF iframe)
  isSuccess.value = true
}



  } catch (error) {
    console.error('Order submission failed:', error)
  //  toast.error('Failed to place order.')
  } finally {
    isSubmitting.value = false
  }
}


onMounted(() => {

    console.log('this is:', saved.value?.totals)
})

</script>

<template>

 <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white animate-fade-in" v-if="isSuccess">
  <div class="text-center mb-6">
    <h2 class="text-2xl font-bold text-green-600 mb-2">🎉 Order Placed Successfully!</h2>
    <p class="text-gray-700">Thank you for your order. A confirmation PDF is ready below.</p>
  </div>

  <!-- Actions -->
  <div class="flex items-center justify-center gap-3 mb-4">
    <a
      v-if="pdfUrl"
      :href="pdfUrl"
      download="order-confirmation.pdf"
      class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
    >
      Download PDF
    </a>
    <button
      v-if="pdfUrl"
      type="button"
      @click="() => { const w = window.open(pdfUrl, '_blank'); w?.print?.() }"
      class="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
    >
      Print
    </button>
    <NuxtLink
      to="/"
      class="inline-flex items-center rounded-md bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white px-4 py-2 text-sm font-semibold"
    >
      Go to Home
    </NuxtLink>
  </div>

  <!-- PDF iframe -->
  <div class="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
    <div v-if="pdfUrl">
      <iframe :src="pdfUrl" class="w-full" style="height:min(80vh,900px)" title="Order confirmation PDF"></iframe>
    </div>
    <div v-else class="p-6 text-center text-sm text-slate-500">
      Building your PDF…
    </div>
  </div>
</section>


<!-- STEP 1: Confirmation -->
<section v-else-if="step === 'confirm'" class="max-w-screen-xl mx-auto px-4 py-8 bg-white">
   <OrderConfirm
  v-if="step === 'confirm'"
  :orderRef="saved?.orderRef || 'ISC-…'"
  :invoiceDate="new Date().toLocaleDateString()"
  :supplier="{
    name: 'Industrial Supplies Center LLC',
    lines: ['PO BOX 39, M.C.C., PC: 101', '101, Way No: 7715', 'Mabelah, Sanaiya, Muscat, Oman']
  }"
  :shipping="{
    shipper_id: saved?.shippingOption?.shipper_id || 0,
    destination_id: saved?.shippingOption?.destination_id || 0,
    basis: saved?.shippingOption?.basis || 'weight',
    currency: saved?.shippingOption?.currency || 'OMR',
    total_price: saved?.shippingOption?.total_price || 0,
    breakdown: saved?.shippingOption?.breakdown || [],
    deliverymethod: saved?.deliveryMethod || '—' 
  }"
  :buyer="{
    name: user?.Company_Name || '—',
    lines: selectedAddress ? [
      selectedAddress?.street || '',
      `${selectedAddress?.city?.City_Name || ''}, ${selectedAddress?.district?.District_Name || ''}`,
      `${selectedAddress?.region?.Region_Name || ''}, ${selectedAddress?.country?.Country_Name || ''}`
    ].filter(Boolean) : ['—']
  }"
  :supplierContact="{ label: 'SUPPLIER CONTACT', name: 'Muhammed Shanid', phone: '+968 93219447', tel: '+968 24460320', email: 'motorsales@isc-depot.com' }"
  :buyerContact="selectedAddress ? { label: 'BUYER CONTACT', name: selectedAddress?.Contact_Person_Name, phone: selectedAddress?.Telephone, email: user?.Email } : undefined"
  paymentTerms="60 Days"
  currency="OMR"
  supplierTin="OM1100033153"
  buyerVatin="—"
  supplierDoRef="—"
  buyerPoRef="—"
  deliveryTerms="DDP Muscat"
  :bank="{
    accountName: 'INDUSTRIAL SUPPLIES CENTER LLC',
    accountNumber: '1074-0105031-001',
    currency: 'OMR',
    swift: 'NBOMOMRXXXX',
    bankName: 'National Bank of Oman',
    bankAddress: 'Corporate Branch, PO Box 751, PC:112, Ruwi, Muscat, Sultanate of Oman'
  }"
  :items="cart.cartItems.map((i: { name: any; slug: any; id: any; quantity: any; price: any }, idx: number) => ({
     sl: idx + 1,
  description: `${i.name}\nSKU: ${i.slug || i.id}`,
  qty: i.quantity,
  unit: 'EA',
  unitPrice: Number(i.price),
  totalExcl: Number(i.price) * Number(i.quantity),
  vatPct: 5,
  vatAmt: Number(i.price) * Number(i.quantity) * 0.05,
  totalIncl: Number(i.price) * Number(i.quantity) * 1.05
  }))"
  :totals="{
    taxable: savedSubtotal,
    vat: savedVat,
    grand: savedGrand
  }"
  :onConfirm="() => { step = 'payment' }"
/>



</section>



  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white" v-else-if="step === 'payment'">
    <!-- Back link -->
    <div class="mb-4">
      <NuxtLink to="/cart" class="text-[#00bfa5] hover:underline text-sm">← Back to Cart</NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-2 space-y-8">
 


  <!-- Products Review (Accordion) -->
<div class="bg-[#f9f9f9] border border-gray-200 rounded-lg shadow-sm">
  <!-- Header / Toggle -->
  <button
    type="button"
    class="w-full flex items-center justify-between px-5 py-4"
    @click="itemsOpen = !itemsOpen"
    :aria-expanded="itemsOpen"
    aria-controls="order-items"
  >
    <div class="flex items-center gap-2">
      <span class="text-lg font-semibold text-gray-800">🛒 Items in Your Order</span>
      <span class="text-xs text-gray-500">({{ cart.cartItems.length }})</span>
    </div>

    <!-- Chevron -->
    <svg
      class="h-5 w-5 text-gray-600 transition-transform duration-200"
      :class="itemsOpen ? 'rotate-180' : ''"
      viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
    >
      <path fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
        clip-rule="evenodd" />
    </svg>
  </button>

  <!-- Body -->
  <transition name="accordion">
    <div
      v-show="itemsOpen"
      id="order-items"
      class="px-5 pb-5 overflow-hidden"
      role="region"
      aria-label="Order items"
    >
      <div
        v-for="item in cart.cartItems"
        :key="item.id"
        class="flex justify-between items-center border-t pt-4 pb-5 first:border-t-0"
      >
        <div class="flex gap-4">
          <img :src="`${$r2Url}/${item.image}`" alt="product"
               class="w-16 h-16 object-cover rounded border" />
          <div class="text-sm">
            <p class="font-semibold text-gray-800">{{ item.name }}</p>

            <!-- Quantity + Buttons -->
            <div class="flex items-center space-x-2 mt-1">
              
            <span>{{ item.quantity }} Pc (s)</span>

            
            </div>

            <p class="text-xs text-gray-500 mt-1">OMR {{ item.price }} / each</p>
          </div>
        </div>

        <p class="text-sm font-semibold text-gray-800 whitespace-nowrap">
          OMR {{ (item.price * item.quantity).toFixed(2) }}
        </p>
      </div>
    </div>
  </transition>
</div>


  
<div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
  <h3 class="font-semibold text-gray-800 text-lg mb-4">Choose Payment Method</h3>

  <!-- Accepted cards (badge row) -->
  <div
    v-if="paymentMethod === 'card'"
    class="flex items-center gap-2 text-xs text-gray-600 mb-3"
  >
    <span>We accept:</span>
    <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">VISA</span>
    <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">Mastercard</span>
    <span class="inline-flex items-center gap-1 px-2 py-1 rounded border bg-white">AmEx</span>
  </div>

  <!-- Accordion / radio list -->
  <div class="space-y-3">

    <!-- Credit Card -->
    <div class="border rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 text-left"
        @click="paymentMethod = 'card'"
      >
        <div class="flex items-center gap-3">
          <input type="radio" class="accent-[#00bfa5]" value="card" v-model="paymentMethod" />
          <span class="font-medium text-gray-800">Pay with Credit Card</span>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <transition name="fade">
        <div v-if="paymentMethod === 'card'" class="px-4 pb-4 pt-0 border-t">
          <!-- Card mock -->
           <div class="relative w-full max-w-md mx-auto my-4 isc-perspective">

            <div class="jp-card-container max-w-md mx-auto my-4">
                <div
                  class="jp-card"
                  :class="[
                    focusedBack && 'jp-card-flipped',
                    brand !== 'unknown' && 'jp-card-identified',
                    brand && `jp-card-${brand}`   // 'visa' | 'mastercard' | 'amex'
                  ]"
                >
                  <!-- FRONT -->
                  <div class="jp-card-front">
                    <!-- all logos present; CSS shows the active one via jp-card-<brand> on the root -->
                    <div class="jp-card-logo jp-card-visa"></div>
                    <div class="jp-card-logo jp-card-mastercard"></div>
                    <div class="jp-card-logo jp-card-amex"></div>

                    <div class="jp-card-lower">
                      <div class="jp-card-shiny"></div>
                      <div class="jp-card-number jp-card-display">{{ maskedNumber }}</div>
                      <div class="jp-card-name jp-card-display">{{ nameDisplay }}</div>
                      <div
                        class="jp-card-expiry jp-card-display"
                        data-before="month/year"
                        data-after="valid thru"
                      >
                        {{ expiryDisplay }}
                      </div>
                    </div>
                  </div>

                  <!-- BACK -->
                  <div class="jp-card-back">
                    <div class="jp-card-bar"></div>
                    <div class="jp-card-cvc jp-card-display">
                      {{ card.cvc || (brand==='amex' ? '••••' : '•••') }}
                    </div>
                    <div class="jp-card-shiny"></div>
                  </div>
                </div>
              </div>
              
           </div>

             <!-- Inputs hooked to the preview -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
              :value="card.number"
              @input="onCardNumberInput"
              inputmode="numeric"
              pattern="\d*"
              autocomplete="cc-number"
              placeholder="Card Number"
              class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
            />
              <input
                v-model.trim="card.name"
                placeholder="Full Name"
                autocomplete="cc-name"
                class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
              />
            <input
              :value="card.expiry"
              @input="onExpiryInput"
              placeholder="MM/YY"
              inputmode="numeric"
              autocomplete="cc-exp"
              maxlength="5"
              class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
            />
              <input
                v-model.trim="card.cvc"
                :maxlength="brand==='amex' ? 4 : 3"
                placeholder="CVC"
                inputmode="numeric"
                autocomplete="cc-csc"
                @focus="focusedBack = true"
                @blur="focusedBack = false"
                class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
              />
            </div>

          <p v-if="!cardValid && triedSubmit" class="text-xs text-red-600 mt-2">
            Please enter a valid card number, expiry (MM/YY), CVC, and full name.
          </p>
        </div>
      </transition>
    </div>

    <!-- Cash on Delivery -->
    <div class="border rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 text-left"
        @click="paymentMethod = 'cod'"
      >
        <div class="flex items-center gap-3">
          <input type="radio" class="accent-[#00bfa5]" value="cod" v-model="paymentMethod" />
          <span class="font-medium text-gray-800">Cash on Delivery (COD)</span>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <transition name="fade">
        <div v-if="paymentMethod === 'cod'" class="px-4 pb-4 pt-0 border-t text-sm text-gray-600">
          Pay in cash upon delivery. The courier will contact you before arrival.
        </div>
      </transition>
    </div>

    <!-- Bank Transfer -->
    <div class="border rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between px-4 py-3 text-left"
        @click="paymentMethod = 'transfer'"
      >
        <div class="flex items-center gap-3">
          <input type="radio" class="accent-[#00bfa5]" value="transfer" v-model="paymentMethod" />
          <span class="font-medium text-gray-800">Bank Transfer</span>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <transition name="fade">
        <div v-if="paymentMethod === 'transfer'" class="px-4 pb-4 pt-0 border-t">
          <div class="text-sm text-gray-700 space-y-2">
            <p class="font-medium">Transfer to:</p>
            <ul class="text-gray-600 text-sm">
              <li>Bank: <span class="font-medium">Bank Muscat</span></li>
              <li>Account Name: <span class="font-medium">Kasr Althqt LTljart EST</span></li>
              <li>IBAN: <span class="font-medium">OMxx 0000 0000 0000 0000</span></li>
            </ul>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input
              v-model.trim="transfer.reference"
              placeholder="Transfer Reference"
              class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
            />
            <input
              v-model.trim="transfer.payerName"
              placeholder="Payer Full Name"
              class="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00bfa5]/50"
            />
          </div>
          <p v-if="!transferValid && triedSubmit" class="text-xs text-red-600 mt-2">
            Please provide transfer reference and payer name.
          </p>
        </div>
      </transition>
    </div>
  </div>
</div>


 
</div>


      <!-- Right Column: Order Summary -->
      <div class="bg-gray-50 border rounded-lg p-5 shadow-sm">

         <h3 class="font-semibold text-gray-800 text-lg mb-1">📦 Shipping To</h3>
      <p class="text-sm text-gray-600" v-if="selectedAddress">
        {{ selectedAddress.Contact_Person_Name }}<br>
        {{ selectedAddress.Telephone }}<br>
       {{ selectedAddress.country?.Country_Name }}, {{ selectedAddress.region?.Region_Name }}, {{ selectedAddress.district?.District_Name }} , {{ selectedAddress.city?.City_Name }}, 
      </p>
      <p class="text-sm text-gray-400" v-else>
        No address selected
      </p>
      <br>
        <!-- Order Summary -->
        <h3 class="text-lg font-semibold mb-4">Order Summary</h3>
        <div class="space-y-2 text-sm text-gray-700">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span>OMR {{ cart.totalPrice().toFixed(3) }}</span>
          </div>
          
          <div class="flex justify-between">
    <span>Shipping</span>
    <span>OMR {{ savedShippingCost.toFixed(3) }}</span>
  </div>
  <div class="flex justify-between">
    <span>VAT (5%)</span>
    <span>OMR {{ savedVat.toFixed(3) }}</span>
  </div>
          <hr class="my-3" />
           <div class="flex justify-between font-semibold text-[#00bfa5] text-base">
    <span>Total</span>
    <span>OMR {{ savedGrand.toFixed(3) }}</span>
  </div>
        </div>

        <!-- Submit Order -->
        <button
          :disabled="isSubmitting || cart.cartItems.length === 0"
            @click="submitOrder"
          class="mt-5 w-full text-white font-semibold py-2 rounded-lg text-sm transition
            bg-[#e53935] hover:bg-[#c62828] disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
  <span>{{ isSubmitting ? 'Processing...' : 'Submit Order' }}</span>
        </button>

        
      </div>
    </div>
  </section>
</template>


<style>
.isc-perspective { perspective: 1000px; }
.isc-3d { transform-style: preserve-3d; position: relative; }  /* ensures the back overlays the front */
.isc-rotY-180 { transform: rotateY(180deg); }
.isc-backface-hide { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.isc-face { width: 100%; height: 11rem; }
</style>


