<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})

import { useCartStore } from '~/stores/cart'
import { ref, onMounted, computed,watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useShippingQuotes } from '@/composables/useShippingQuotes'
 


const { user, isAuthenticated } = useAuth()

const { $axios, $r2Url } = useNuxtApp()

const { options: shippingOptions, loading: quotesLoading, fetchQuotes } = useShippingQuotes()
const selectedOption = ref<any|null>(null)



interface ShippingOption {
  shipper_id: number
  destination_id: number
  basis: 'weight' | 'volume' | 'heavy'
  price: number
  currency: string
  weight_kg?: number | null
  volume_cbm?: number | null
}



interface OrderPayload {
  customer_id: number
  delivery_method: 'ship' | 'pickup'
  Customers_Contacts_Id: number | null // ✅ Nullable for pickup
  shipping_cost: number
  shipping_option: ShippingOption | null
  cart_items: {
    product_id: number
    quantity: number
    price: number
    subtotal: number
    vat: number
  }[]
}


const isSubmitting = ref(false)
const isSuccess = ref(false)
const itemsOpen = ref(false) 
const cart = useCartStore()
 
const toast = useToast()
 


const selectedAddress = ref<any>(null);


const shippingOk = computed(() =>
  cart.deliveryMethod === 'pickup' ||
  (Boolean(selectedAddress.value) && Boolean(selectedOption.value))
)

// Payment requirements OK per method
const paymentOk = computed(() => {
  if (paymentMethod.value === 'card') return cardValid.value
  if (paymentMethod.value === 'transfer') return transferValid.value
  if (paymentMethod.value === 'cod') return true
  return false
})

// Final gate for enabling the button
const canSubmit = computed(() => shippingOk.value && paymentOk.value)


const totals = computed(() => {
  const weight = cart.cartItems.reduce((s,i)=> s + (i.weight * i.quantity), 0)
  const volume = cart.cartItems.reduce((s,i)=> {
    const cbm = (i.length * i.width * i.height) / 1_000_000
    return s + (cbm * i.quantity)
  }, 0)
  return { weight_kg: +weight.toFixed(3), volume_cbm: +volume.toFixed(4) }
})

// Helper: read items from localStorage for quoting
const readCartItemsForQuote = (): { product_id: number; qty: number }[] => {
  // Adjust the key if your app uses a different one
  const raw = localStorage.getItem('cart_items') || localStorage.getItem('cart')
  if (!raw) {
    // fallback to Pinia store if LS empty
    return cart.cartItems.map(i => ({ product_id: Number(i.id), qty: Number(i.quantity) }))
  }
  try {
    const parsed = JSON.parse(raw)

    // shape A: [{ id, quantity }]
    if (Array.isArray(parsed)) {
      return parsed
        .filter(i => i?.id && i?.quantity)
        .map(i => ({ product_id: Number(i.id), qty: Number(i.quantity) }))
    }

    // shape B: { items: [{ product_id, qty }] }
    if (Array.isArray((parsed as any).items)) {
      return (parsed as any).items
        .filter((i: any) => i?.product_id && i?.qty)
        .map((i: any) => ({ product_id: Number(i.product_id), qty: Number(i.qty) }))
    }
  } catch {
    // fallback to Pinia store on parse error
    return cart.cartItems.map(i => ({ product_id: Number(i.id), qty: Number(i.quantity) }))
  }
  return []
}



const requestQuotes = async () => {
  if (cart.deliveryMethod !== 'ship') return
  const storedId = localStorage.getItem('selected_address_id')
  if (!storedId) return

  const items = readCartItemsForQuote()
  if (!items.length) return

  try {
    const { data } = await $axios.post('/api/v1/shipping/quotes', {
      address_id: parseInt(storedId, 10),
      items,              // ✅ send items instead of totals
      include_heavy: false
    })

    // server returns options sorted by price; keep your existing handling
    shippingOptions.value = data?.options ?? []
    selectedOption.value = shippingOptions.value[0] || null

    // (optional) you can store server totals if you want:
    // totalsFromServer.value = data?.totals
  } catch (e:any) {
    console.error('Failed to fetch shipping quotes', e)
  }
}
 

watch([() => cart.cartItems, () => cart.deliveryMethod, selectedAddress, totals], requestQuotes, { deep: true })


type Brand = 'visa' | 'mastercard' | 'amex' | 'unknown'
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')

const detectBrand = (num: string): Brand => {
  const s = onlyDigits(num)
  if (/^4\d{0,15}$/.test(s)) return 'visa'
  if (/^(5[1-5]\d{0,14}|2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)\d{0,12})$/.test(s)) return 'mastercard'
  if (/^3[47]\d{0,13}$/.test(s)) return 'amex'
  return 'unknown'
}

// format number as you type (AmEx 4-6-5, others 4-4-4-4)
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
  // keep only digits and cap to 16
  const digits = el.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
  // format (your formatNumber already handles spacing)
  const formatted = formatNumber(digits)

  // reflect sanitized value in both the input and your state
  if (el.value !== formatted) el.value = formatted
  card.value.number = formatted

  // keep caret at the end
  requestAnimationFrame(() => el.setSelectionRange(formatted.length, formatted.length))
}

const onExpiryInput = (e: Event) => {
  const el = e.target as HTMLInputElement
  const formatted = formatExpiry(el.value)
  if (el.value !== formatted) el.value = formatted
  card.value.expiry = formatted
}

// keep only digits, max 4 (MMYY), auto-insert slash, clamp month
const formatExpiry = (raw: string) => {
  let d = raw.replace(/\D/g, '').slice(0, 4)

  // if first digit > 1, treat it as 0X (e.g. 3 -> 03…)
  if (d.length >= 1 && parseInt(d[0], 10) > 1) {
    d = ('0' + d).slice(0, 4)
  }

  let mm = d.slice(0, 2)
  let yy = d.slice(2, 4)

  if (mm.length === 2) {
    const m = parseInt(mm, 10)
    if (m === 0) mm = '01'
    else if (m > 12) mm = '12'
  }

  return yy ? `${mm}/${yy}` : (d.length > 2 ? `${mm}/` : mm)
}
const brand = computed<Brand>(() => detectBrand(card.value.number))
const maskedNumber = computed(
  () => (formatNumber(card.value.number) || '•••• •••• •••• ••••').replace(/\d(?=\d{4})/g, '•')
)
const nameDisplay = computed(() => (card.value.name || 'FULL NAME').toUpperCase().slice(0, 26))
const expiryDisplay = computed(() => card.value.expiry || 'MM/YY')

// flip to the back while CVC is focused
const focusedBack = ref(false)

const paymentMethod = ref<'card' | 'cod' | 'transfer'>('card')

const triedSubmit = ref(false) // you reference this in the template

const card = ref({
  number: '',
  name: '',
  expiry: '',
  cvc: '',
})

// Bank transfer fields + validity
const transfer = ref({ reference: '', payerName: '' })
const transferValid = computed(() =>
  Boolean(transfer.value.reference.trim() && transfer.value.payerName.trim())
)

// Minimal card validation (Luhn + basic format)
const luhn = (num: string) => {
  const s = (num || '').replace(/\D/g, '')
  if (!s) return false
  let sum = 0
  let dbl = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s[i], 10)
    if (dbl) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

const cardValid = computed(() => {
  const numberStripped = card.value.number.replace(/\s+/g, '')
  const numberOk = numberStripped.length >= 13 && luhn(numberStripped)
  const nameOk = card.value.name.trim().length >= 3
  const expOk = /^((0[1-9])|(1[0-2]))\/\d{2}$/.test(card.value.expiry) // MM/YY
  const cvcOk = /^\d{3,4}$/.test(card.value.cvc)
  return numberOk && nameOk && expOk && cvcOk
})


 



const fetchSelectedAddress = async () => {
  if (cart.deliveryMethod !== 'ship') return

  const id = localStorage.getItem('selected_address_id')
  if (!id) return

  try {
    const res = await $axios.get(`/api/contacts/${id}`)
    selectedAddress.value = res.data

    console.log(selectedAddress.value);
  } catch (error) {
    console.error('Failed to fetch selected address:', error)
  }
}

const submitOrder = async () => {
  if (cart.cartItems.length === 0 || isSubmitting.value) return

  isSubmitting.value = true

  try {
    // ✅ Retrieve selected address ID from localStorage
    const storedAddressId = localStorage.getItem('selected_address_id')
    const addressId = storedAddressId ? parseInt(storedAddressId) : null

    if (!addressId && cart.deliveryMethod === 'ship') {
      toast.error('Please select a shipping address.')
      isSubmitting.value = false
      return
    }

    const parseExp = (mmYY: string) => {
  const m = Number(mmYY.slice(0, 2)) || null
  const y = Number(mmYY.slice(3, 5))
  const year = isNaN(y) ? null : 2000 + y
  return { m, year }
}

const { m: exp_month, year: exp_year } = parseExp(card.value.expiry)

const payment = {
  method: paymentMethod.value,                  // 'card' | 'cod' | 'transfer'
  currency: 'OMR',
  amount: Number((cart.totalPrice() + shippingCost.value).toFixed(3)),
  card: paymentMethod.value === 'card' ? {
    brand: brand.value,                         // 'visa' | 'mastercard' | 'amex' | 'unknown'
    last4: onlyDigits(card.value.number).slice(-4),
    exp_month, exp_year
  } : null,
  transfer: paymentMethod.value === 'transfer' ? {
    reference: transfer.value.reference,
    payer_name: transfer.value.payerName
  } : null
}

   const payload: OrderPayload & { payment: any } = {
  customer_id: 1,  // TODO: real customer id
  delivery_method: cart.deliveryMethod,
  shipping_cost: shippingCost.value,
  Customers_Contacts_Id: cart.deliveryMethod === 'ship' ? addressId : null,
  // ✅ include the chosen quote (or null if pickup / none selected)
  shipping_option: cart.deliveryMethod === 'ship' && selectedOption.value ? {
    shipper_id: selectedOption.value.shipper_id,
    destination_id: selectedOption.value.destination_id,
    basis: selectedOption.value.basis,         // 'weight' | 'volume' | 'heavy'
    price: Number(selectedOption.value.total_price),
    currency: selectedOption.value.currency ?? 'OMR',
    // helpful for auditing/calculation reproducibility:
    weight_kg: totals.value.weight_kg,
    volume_cbm: totals.value.volume_cbm
  } : null,
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

    if (response.status === 200) {
      cart.clearCart()
      isSuccess.value = true
      toast.success('Order placed successfully!')
    }
  } catch (error) {
    console.error('Order submission failed:', error)
    toast.error('Failed to place order.')
  } finally {
    isSubmitting.value = false
  }
}



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

  if (isNaN(value) || value < 1) {
    item.quantity = 1 // fallback to 1 if invalid
  } else {
    item.quantity = value
  }

  // Optionally trigger backend update here
  // await $axios.post('/api/cart/update', { id, quantity: item.quantity })
}

watch(() => cart.deliveryMethod, (val) => {
  if (val !== 'ship') {
    selectedAddress.value = null
  } else {
    fetchSelectedAddress()
  }
})

const shippingCost = computed(() => {
  return cart.deliveryMethod === 'ship' && selectedOption.value
    ? Number(selectedOption.value.total_price)
    : 0
})

onMounted(()=>{
          fetchSelectedAddress()
          requestQuotes()
          })
</script>
<template>

<section class="max-w-screen-xl mx-auto px-4 py-8 bg-white text-center animate-fade-in" v-if="isSuccess">
  <h2 class="text-2xl font-bold text-green-600 mb-2">🎉 Order Placed Successfully!</h2>
  <p class="text-gray-700 mb-4">Thank you for your order. A confirmation email has been sent.</p>
  <NuxtLink
    to="/"
    class="inline-block bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
  >
    Go to Home
  </NuxtLink>
</section>


  <section class="max-w-screen-xl mx-auto px-4 py-8 bg-white" v-else>
    <!-- Back link -->
    <div class="mb-4">
      <NuxtLink to="/cart" class="text-[#00bfa5] hover:underline text-sm">← Back to Cart</NuxtLink>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Column -->
      <div class="md:col-span-2 space-y-8">

  <!-- ✅ Checkout Title -->
  <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
    <h2 class="text-2xl font-bold text-gray-800 mb-4"><span role="img" aria-label="receipt">🧾</span> Checkout Information</h2>

    <!-- Purchase Order -->
    <div>

       <p>Name : {{ user?.User_Name  }}</p>
      

    </div>
  </div>


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
              <button
                @click="decrementQty(item.id)"
                class="px-2 py-1 bg-gray-100 border rounded hover:bg-gray-200"
              >−</button>

              <input
                type="number"
                min="1"
                v-model.number="item.quantity"
                class="w-12 border rounded text-center text-xs py-1"
                @change="onQtyInputChange($event, item.id)"
              />

              <button
                @click="incrementQty(item.id)"
                class="px-2 py-1 bg-gray-100 border rounded hover:bg-gray-200"
              >+</button>
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


  
  <div class="mt-4">
  <div class="flex items-center justify-between">
    <h4 class="font-semibold">Shipping Options</h4>
    <span v-if="quotesLoading" class="text-xs text-gray-500">Calculating…</span>
  </div>

  <div v-if="shippingOptions.length === 0 && !quotesLoading" class="text-sm text-gray-500 mt-2">
    No shipping options available for this address and cart totals.
  </div>

  <div v-for="opt in shippingOptions" :key="`${opt.shipper_id}-${opt.basis}-${opt.destination_id}`"
       class="mt-2 p-3 border rounded flex items-center justify-between">
    <label class="flex items-center gap-3">
      <input type="radio" name="shippingOption"
             :value="opt"
             v-model="selectedOption">
      <div>
        <div class="font-semibold">
          {{ opt.shipper_name }} — <span class="capitalize">{{ opt.basis }}</span>
        </div>
        <div class="text-xs text-gray-500">
          {{ opt.breakdown.band_label || 'Band' }} |
          Std: {{ opt.breakdown.standard_rate }} |
          Base: {{ opt.breakdown.base_fee }} |
          Per-unit: {{ opt.breakdown.per_unit_fee }} × {{ opt.breakdown.units_used }} |
          Flat: {{ opt.breakdown.flat_fee }}
        </div>
      </div>
    </label>
    <div class="font-semibold text-[#00bfa5]">
      {{ opt.currency }} {{ opt.total_price }}
    </div>
  </div>
</div>
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
            <span>OMR {{ cart.totalPrice() }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax</span>
            <span>TBD</span>
          </div>
          <div class="flex justify-between">
            <span>Shipping</span>
            <span>OMR {{ shippingCost }}</span>
          </div>
          <hr class="my-3" />
          <div class="flex justify-between font-semibold text-[#00bfa5] text-base">
            <span>Total</span>
            <span>OMR {{ (cart.totalPrice() + shippingCost).toFixed(3) }}</span>
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


