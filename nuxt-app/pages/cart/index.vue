<script setup lang="ts">
definePageMeta({ layout: 'layouts' })

// Imports
import { useCartStore } from '~/stores/cart'
import { useShippingQuotes } from '@/composables/useShippingQuotes'

// Init first (so everything below can safely use them)
const { $r2Url, $axios } = useNuxtApp()
const cart = useCartStore()
const { user, isAuthenticated } = useAuth()

// Shipping quotes composable
const { options: shippingOptions, loading: quotesLoading, fetchQuotes } = useShippingQuotes()
const selectedOption = ref<any | null>(null)


const totalsForQuotes = computed(() => {
  const weight = cart.cartItems.reduce((s, i) => s + ((i.weight || 0) * i.quantity), 0)
  const volume = cart.cartItems.reduce((s, i) => {
    const cbm = ((i.length || 0) * (i.width || 0) * (i.height || 0)) / 1_000_000
    return s + (cbm * i.quantity)
  }, 0)
  return { weight_kg: +weight.toFixed(3), volume_cbm: +volume.toFixed(4) }
})





// Persist selected address
watch(() => cart.selectedAddressId, (id) => {
  if (id) localStorage.setItem('selected_address_id', String(id))
}, { immediate: true })

// Quote inputs from cart items
const itemsForQuote = computed(() =>
  cart.cartItems.map(i => ({ product_id: Number(i.id), qty: Number(i.quantity) }))
)

// Request quotes when cart/delivery/address changes
 
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

watch([() => cart.cartItems, () => cart.deliveryMethod, totalsForQuotes], requestQuotes, { deep: true })

// Addresses
const addresses = ref<any[]>([])
const showAddressModal = ref(false)
const countries = ref<any[]>([])
const regions = ref<any[]>([])
const districts = ref<any[]>([])
const states = ref<any[]>([])
const cities = ref<any[]>([])
const newAddress = reactive({
  Country_Id: '', State_Id: '', City_Id: '',
  Region_Id: '', District_Id: '', Contact_Person_Name: '',
  Telephone: '', Designation: '', Remarks: '',
})

const fetchAddresses = async () => {
  if (!isAuthenticated) return
  try {
    const res = await $axios.get('/api/contacts')
    addresses.value = res.data
    const stored = localStorage.getItem('selected_address_id')
    const candidate = stored ? Number(stored) : addresses.value[0]?.id
    if (candidate) cart.selectedAddressId = candidate
  } catch (e) {
    console.error('Failed to fetch addresses', e)
  }
}

// Totals (+5% VAT)
const subtotal = computed(() => +cart.totalPrice().toFixed(3))
const shippingCost = computed(() =>
  cart.deliveryMethod === 'ship' && selectedOption.value
    ? Number(selectedOption.value.total_price)
    : 0
)
const vat = computed(() => +(((subtotal.value + shippingCost.value) * 0.05)).toFixed(3))
const grandTotal = computed(() =>
  +(subtotal.value + shippingCost.value + vat.value).toFixed(3)
)

// Qty handlers, address helpers (unchanged)
const onQtyInputChange = (e: Event, id: number) => {
  const v = (e.target as HTMLInputElement).valueAsNumber
  if (v > 0) cart.updateQuantity(id, v)
}
const incrementQty = (id: number) => { const it = cart.cartItems.find(i => i.id === id); if (it) it.quantity++ }
const decrementQty = (id: number) => { const it = cart.cartItems.find(i => i.id === id); if (it && it.quantity > 1) it.quantity-- }

const loadCountries = async () => { if (!isAuthenticated) return; const r = await $axios.get('/api/countries'); countries.value = r.data }
const loadRegions = async () => { const r = await $axios.get('/api/region'); regions.value = r.data.data }
const loadDistricts = async () => { const r = await $axios.get('/api/district'); districts.value = r.data.data }
const loadStates = async () => { states.value = []; cities.value = []; if (!newAddress.Country_Id) return; const r = await $axios.get(`/api/contacts/by-country/${newAddress.Country_Id}`); states.value = r.data }
const loadCities = async () => { const r = await $axios.get(`/api/contacts/by-state/${newAddress.District_Id}`); cities.value = r.data }

const submitAddress = async () => {
  try {
    await $axios.post('/api/contacts', newAddress)
    showAddressModal.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to save address', e)
  }
}

const onClearCart = () => {
  cart.clearCart()
   shippingOptions.value = []
   selectedOption.value = null

}

const onRemoveItem = (id: number) => {
  cart.removeFromCart(id)
   shippingOptions.value = []
   selectedOption.value = null

}


// --- PERSIST CHECKOUT SELECTION & TOTALS ---
const persistCheckout = () => {
  const payload = {
    deliveryMethod: cart.deliveryMethod,               // 'ship' | 'pickup'
    addressId: cart.selectedAddressId ?? null,         // the selected address
    // keep just what you need from the quote (avoid circular/huge objects)
    shippingOption: selectedOption.value
      ? {
          shipper_id: selectedOption.value.shipper_id,
          destination_id: selectedOption.value.destination_id,
          basis: selectedOption.value.basis,           // 'weight' | 'volume' | 'heavy'
          currency: selectedOption.value.currency ?? 'OMR',
          total_price: Number(selectedOption.value.total_price),
          breakdown: selectedOption.value.breakdown ?? null,
        }
      : null,
    totals: {
      currency: 'OMR',
      subtotal: +subtotal.value.toFixed(3),
      shipping: +shippingCost.value.toFixed(3),
      vat: +vat.value.toFixed(3),
      grand: +grandTotal.value.toFixed(3),
    },
    items: cart.cartItems.map(i => ({
      id: i.id, slug: i.slug, qty: i.quantity, price: i.price,
    })),
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem('checkout_prefill', JSON.stringify(payload))
}


watch(
  [
    () => cart.deliveryMethod,
    () => cart.selectedAddressId,
    selectedOption,
    subtotal,
    shippingCost,
    vat,
    grandTotal,
    () => cart.cartItems,
  ],
  persistCheckout,
  { deep: true, immediate: true }
)

const router = useRouter()
const goCheckout = () => {
  persistCheckout()
  router.push('/cart/checkout')
}

onMounted(async () => {
  if (isAuthenticated.value === true) {
    await fetchAddresses()
    await loadCountries()
    await loadRegions()
    await loadDistricts()
      requestQuotes()
  }
})
</script>


<template>
  <section class="bg-white py-10 px-4 max-w-screen-xl mx-auto font-sans">
    <h5 class="text-3xl font-bold mb-6 text-gray-800 tracking-wide">
      <span class="text-gradient">Your Cart</span>
    </h5>

    <div class="space-y-4">
      <p class="text-gray-600">You have {{ cart.cartItems.length }} items in your cart.</p>
      <NuxtLink to="/" class="text-sm text-blue-600 hover:underline">Continue Shopping</NuxtLink>
    </div>
   
 

    <!-- Products -->
    <!-- ============ PRODUCTS + SUMMARY IN ONE GRID ============ -->
<div class="grid md:grid-cols-3 gap-6 items-start">

  <!-- Products (left, span 2) -->
  <div class="md:col-span-2 border rounded-xl shadow-sm">
    <div class="flex justify-between items-center px-4 md:px-5 py-3 border-b bg-[#f9f9f9]">
      <h2 class="font-semibold text-gray-800 text-base md:text-lg">Items in Cart</h2>
      <button
        @click="onClearCart"
        class="flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md text-sm transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Clear Cart
      </button>
    </div>

    <div
      v-for="item in cart.cartItems"
      :key="item.id"
      class="flex justify-between items-center px-4 md:px-5 py-3 md:py-4 border-b last:border-b-0 hover:bg-gray-50 transition"
    >
      <div class="flex items-start gap-3 md:gap-4 min-w-0">
        <NuxtLink :to="`/product/${item.slug}`" class="shrink-0">
          <img :src="`${$r2Url}/${item.image}`"
               alt="Product"
               class="w-16 h-16 md:w-20 md:h-20 object-cover border rounded-lg shadow-sm" />
        </NuxtLink>
        <div class="min-w-0">
          <h3 class="font-medium text-gray-800 truncate">{{ item.name }}</h3>
          <p class="text-[11px] text-gray-500">Item #{{ item.id }}</p>
          <button @click.prevent="onRemoveItem(item.id)"
                  class="text-xs text-[#00bfa5] hover:underline mt-1.5">Remove</button>
        </div>
      </div>

      <div class="text-right">
        <label class="text-[12px] font-semibold text-gray-600 block mb-1">Qty</label>
        <div class="flex items-center justify-end gap-1">
          <button @click="decrementQty(item.id)"
                  class="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">−</button>
          <input type="number" min="1" v-model.number="item.quantity"
                 @change="onQtyInputChange($event, item.id)"
                 class="w-14 border rounded-md text-center text-sm py-1"  disabled/>
          <button @click="incrementQty(item.id)"
                  class="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">+</button>
        </div>
        <p class="text-sm text-green-700 font-semibold mt-1.5">
          OMR {{ item.price }} <span class="text-xs text-gray-500 font-normal">/ each</span>
        </p>
      </div>
    </div>
  </div>

  <!-- Summary (right, sticky) -->
<div class="md:col-span-1">
  <div class="w-full border rounded-xl shadow-lg bg-[#fafafa] p-5 md:sticky md:top-24 space-y-4">

    <!-- STEP 1: Delivery method -->
    <div>
      <h2 class="text-base md:text-lg font-bold text-gray-800 mb-2">Delivery</h2>
      <div class="space-y-2">
        <label class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer"
               :class="cart.deliveryMethod==='ship' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'">
          <input type="radio" value="ship" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
          Ship to Address
        </label>
        <label class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer"
               :class="cart.deliveryMethod==='pickup' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'">
          <input type="radio" value="pickup" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
          Local Pickup
        </label>
      </div>
    </div>

    <!-- STEP 2: Address (if ship) -->
    <div v-if="cart.deliveryMethod==='ship'">
      <h3 class="font-semibold text-gray-800 text-sm mb-2">Shipping Address</h3>

      <div v-if="!isAuthenticated" class="text-sm text-gray-600">
        Please <NuxtLink to="/login" class="text-teal-600 hover:underline">log in</NuxtLink> to select an address.
      </div>

      <template v-else>
        <div v-if="addresses.length" class="space-y-2">
          <select
            v-model="cart.selectedAddressId"
            class="w-full rounded-md border border-slate-300 px-3 py-2 bg-white text-sm"
          >
            <option v-for="a in addresses" :key="a.id" :value="a.id">
              {{ a.Contact_Person_Name }} — {{ a.country?.Country_Name }}, {{ a.city?.City_Name }}
            </option>
          </select>
          <button type="button" @click="showAddressModal = true"
                  class="text-xs text-teal-700 hover:underline">Add new address</button>
        </div>

        <div v-else class="text-sm text-gray-600">
          No addresses yet.
          <button @click="showAddressModal = true" class="text-teal-700 hover:underline font-medium">
            Add one
          </button>
        </div>
      </template>
    </div>

    <!-- STEP 3: Shipping options (after address) -->
    <div v-if="cart.deliveryMethod==='ship' && cart.selectedAddressId">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-gray-800 text-sm">Delivery Options</h3>
        <span v-if="quotesLoading" class="text-[11px] text-gray-500">Calculating…</span>
      </div>

      <div v-if="!quotesLoading && shippingOptions.length===0" class="text-xs text-gray-500 mt-1">
        No options for this address/cart.
      </div>

      <div v-for="opt in shippingOptions"
           :key="`${opt.shipper_id}-${opt.basis}-${opt.destination_id}`"
           class="mt-2 p-3 rounded-md border bg-white flex items-center justify-between"
           :class="selectedOption && selectedOption===opt ? 'border-teal-500' : 'border-slate-200'">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="radio" name="shipOpt" :value="opt" v-model="selectedOption" class="accent-[#00bfa5]">
          <div>
            <div class="font-medium">
              {{ opt.shipper_name }} 
               <!-- — <span class="capitalize">{{ opt.basis }}</span> -->
            </div>
            <!-- <div class="text-[11px] text-gray-500" v-if="opt.breakdown">
              {{ opt.breakdown.band_label || 'Band' }} |
              Std: {{ opt.breakdown.standard_rate }} |
              Base: {{ opt.breakdown.base_fee }} |
              Per-unit: {{ opt.breakdown.per_unit_fee }} × {{ opt.breakdown.units_used }} |
              Flat: {{ opt.breakdown.flat_fee }}
            </div> -->
          </div>
        </label>
        <div class="font-semibold text-[#00bfa5]">
          {{ opt.currency }} {{ opt.total_price }}
        </div>
      </div>
    </div>

    <!-- Totals -->
    <div class="pt-2 border-t">
      <h3 class="text-base md:text-lg font-bold text-gray-800 mb-2">Order Summary</h3>
      <div class="space-y-1.5 text-sm">
        <div class="flex justify-between"><span>Subtotal</span><span>OMR {{ subtotal.toFixed(3) }}</span></div>
        <div class="flex justify-between">
          <span>Shipping</span>
          <span>OMR {{ shippingCost.toFixed(3) }}</span>
        </div>
        <div class="flex justify-between">
          <span>VAT (5%)</span>
          <span>OMR {{ vat.toFixed(3) }}</span>
        </div>
      </div>
      <hr class="my-3" />
      <div class="flex justify-between font-semibold text-lg text-[#00bfa5]">
        <span>Total</span>
        <span>OMR {{ grandTotal.toFixed(3) }}</span>
      </div>

      <button
  type="button"
        @click="goCheckout"
        class="block mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white text-center font-semibold py-2.5 rounded-md shadow transition disabled:opacity-60"
        :disabled="cart.cartItems.length===0 || (cart.deliveryMethod==='ship' && !selectedOption)"
      >
        Proceed to Checkout
    </button>
    </div>
  </div>
</div>

</div>


   
  </section>

  <!-- Address Modal -->
<!-- Add Address Modal -->
<Transition
  enter-active-class="transition-opacity duration-200"
  enter-from-class="opacity-0"
  enter-to-class="opacity-100"
  leave-active-class="transition-opacity duration-150"
  leave-from-class="opacity-100"
  leave-to-class="opacity-0"
>
  <div
    v-if="showAddressModal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    @keydown.esc.prevent.stop="showAddressModal = false"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40" @click="showAddressModal = false"></div>

    <!-- Panel -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
      enter-to-class="opacity-100 translate-y-0 sm:scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 sm:scale-100"
      leave-to-class="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95"
    >
      <div
        v-show="showAddressModal"
        class="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 class="text-lg font-semibold">Add New Address</h3>
          <button
            @click="showAddressModal = false"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="submitAddress" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Country -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <div class="relative">
              <select
                v-model="newAddress.Country_Id"
                @change="loadStates"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400"
              >
                <option value="">-- Select Country --</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
              </select>
              <!-- chevron -->
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>

          <!-- Region -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Region</label>
            <div class="relative">
              <select
                v-model="newAddress.Region_Id"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400"
              >
                <option value="">-- Select Region --</option>
                <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>

          <!-- District -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">District</label>
            <div class="relative">
              <select
                v-model="newAddress.District_Id"
                @change="loadCities"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400"
              >
                <option value="">-- Select District --</option>
                <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.District_Name }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>

          <!-- City -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">City</label>
            <div class="relative">
              <select
                v-model="newAddress.City_Id"
                class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400"
              >
                <option value="">-- Select City --</option>
                <option v-for="ci in cities" :key="ci.id" :value="ci.id">{{ ci.City_Name }}</option>
              </select>
              <svg class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>

          <!-- Contact Person -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
            <input v-model="newAddress.Contact_Person_Name" type="text"
                   class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm
                          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400" />
          </div>

          <!-- Telephone -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
            <input v-model="newAddress.Telephone" type="text"
                   class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm
                          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400" />
          </div>

          <!-- Designation -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Designation</label>
         
              
              <select v-model="newAddress.Designation"
                      class="w-full mt-2 appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400">
                <option value="">-- Select Designation --</option>
                <option value="Mr">Mr</option>
                <option value="Ms">Ms</option>
                <option value="Mrs">Mrs</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
                
                <option value="Sir">Sir</option>
                <option value="Eng">Eng</option>

              </select>            


          </div>

          <!-- Remarks -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea v-model="newAddress.Remarks" rows="3"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm resize-y
                             focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400"></textarea>
          </div>

          <!-- Buttons -->
          <div class="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" @click="showAddressModal = false"
                    class="px-4 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit"
                    class="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:opacity-90">
              Save
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </div>
</Transition>


</template>

