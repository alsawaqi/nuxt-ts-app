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



const selectCls =
  'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm shadow-sm ' +
  'transition focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition ' +
  'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent hover:border-slate-400';

const textareaCls = inputCls + ' resize-y';


const totalsForQuotes = computed(() => {
  const weight = cart.cartItems.reduce((s, i) => s + ((i.weight || 0) * i.quantity), 0)
  const volume = cart.cartItems.reduce((s, i) => {
    const cbm = ((i.length || 0) * (i.width || 0) * (i.height || 0)) / 1_000_000
    return s + (cbm * i.quantity)
  }, 0)
  return { weight_kg: +weight.toFixed(3), volume_cbm: +volume.toFixed(4) }
})



type Option = { id: number; Country_Name?: string; Region_Name?: string; District_Name?: string; City_Name?: string }




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
  } catch (e: any) {
    console.error('Failed to fetch shipping quotes', e)
  }
}

watch([() => cart.cartItems, () => cart.deliveryMethod, totalsForQuotes], requestQuotes, { deep: true })

// Addresses
const addresses = ref<any[]>([])
const showAddressModal = ref(false)
const countries = ref<Option[]>([])
const regions   = ref<Option[]>([])
const districts = ref<Option[]>([])
const states    = ref<Option[]>([]) // kept for parity if you later need state-level
const cities    = ref<Option[]>([])
 const form = reactive({
  id: null as number | null,
  Country_Id: '' as number | string,
  Region_Id: '' as number | string,
  District_Id: '' as number | string,
  City_Id: '' as number | string,
  Contact_Person_Name: '',
  Telephone: '',
  Designation: '',
  Remarks: '',
  Email: '',
  Type: 'shipping', // optional if your API expects it
})
 
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
const subtotal = computed(() => + cart.totalPrice().toFixed(3))
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

 const loadCountries = async () => {
  try {
    const res = await $axios.get('/api/countries')
    countries.value = res.data
  } catch (e) { console.error(e) }
}
const loadRegions = async () => {
  try {
    const res = await $axios.get('/api/region')
    regions.value = res.data.data
  } catch (e) { console.error(e) }
}
const loadDistricts = async () => {
  try {
    const res = await $axios.get('/api/district')
    districts.value = res.data.data
  } catch (e) { console.error(e) }
}
// states by country (if you have)
const loadStates = async (countryId: number | string) => {
  states.value = []
  cities.value = []
  if (!countryId) return
  try {
    const res = await $axios.get(`/api/contacts/by-country/${countryId}`)
    states.value = res.data
  } catch (e) { console.error(e) }
}
// cities by (your API calls it "by-state" but you pass District_Id in your example)
const loadCities = async (districtId: number | string) => {
  cities.value = []
  if (!districtId) return
  try {
    const res = await $axios.get(`/api/contacts/by-state/${districtId}`)
    cities.value = res.data
  } catch (e) { console.error(e) }
}


const submitAddress = async () => {
 
  try {
    await $axios.post('/api/contacts', {
      Country_Id: form.Country_Id || null,
      Region_Id: form.Region_Id || null,
      District_Id: form.District_Id || null,
      City_Id: form.City_Id || null,
      Contact_Person_Name: form.Contact_Person_Name || null,
      Telephone: form.Telephone || null,
      Designation: form.Designation || null,
      Remarks: form.Remarks || null,
      Email: form.Email || null,
      Type: form.Type || null,
    })
     
  showAddressModal.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to save address', e)
  
  } finally {
   
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
    await requestQuotes()
  }
})
</script>


 <template>
  <section class="bg-white py-6 sm:py-10 px-4 max-w-screen-xl mx-auto font-sans">
    <!-- Two-column layout only on lg+ so the right card aligns with the title -->
    <div class="lg:grid lg:grid-cols-3 lg:gap-6">

      <!-- LEFT: Header + Products -->
      <div class="lg:col-span-2">
        <!-- Header lives in the left column to align the right card with it -->
        <header class="mb-4 sm:mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Your Cart</h1>
          <div class="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            You have {{ cart.cartItems.length }} items in your cart.
            <NuxtLink to="/" class="ml-2 text-[#2f5fb6] hover:underline">Continue shopping</NuxtLink>
          </div>
        </header>

        <!-- Items Card -->
        <div class="rounded-xl ring-1 ring-gray-200/80 shadow-sm overflow-hidden">
          <!-- Top bar -->
          <div class="flex items-center justify-between px-3 sm:px-5 py-3 bg-gray-50/80 border-b">
            <h2 class="text-sm sm:text-base font-semibold text-gray-800">Items in Cart</h2>
            <button
              @click="onClearCart"
              class="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>

          <!-- Line items -->
          <div
            v-for="item in cart.cartItems"
            :key="item.id"
            class="px-3 sm:px-5 py-3 sm:py-4 border-b last:border-b-0 bg-white/90"
          >
            <div class="grid grid-cols-[64px,1fr,auto] sm:grid-cols-[84px,1fr,auto] gap-3 sm:gap-4 items-start">
              <!-- image -->
              <NuxtLink :to="`/product/${item.slug}`" class="block rounded-lg overflow-hidden ring-1 ring-gray-200">
                <img :src="`${$r2Url}/${item.image}`" alt="" class="w-16 h-16 sm:w-20 sm:h-20 object-cover" />
              </NuxtLink>

              <!-- info -->
              <div class="min-w-0">
                <h3 class="text-sm sm:text-base font-medium text-gray-900 truncate">{{ item.name }}</h3>
                <p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">Item #{{ item.id }}</p>
                <button
                  @click.prevent="cart.removeFromCart(item.id)"
                  class="mt-1.5 text-xs text-[#00bfa5] hover:underline"
                >
                  Remove
                </button>
              </div>

              <!-- qty + price -->
              <div class="text-right">
                <label class="block text-[11px] sm:text-xs font-semibold text-gray-600 mb-1">Qty</label>
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="decrementQty(item.id)"
                    class="h-7 w-7 grid place-items-center bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                    aria-label="Decrease quantity"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    v-model.number="item.quantity"
                    @change="onQtyInputChange($event, item.id)"
                    class="w-14 h-7 border rounded-md text-center text-sm"
                    disabled
                  />
                  <button
                    @click="incrementQty(item.id)"
                    class="h-7 w-7 grid place-items-center bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                    aria-label="Increase quantity"
                  >+</button>
                </div>
                <p class="text-xs sm:text-sm text-emerald-700 font-semibold mt-1.5">
                  OMR {{ item.price }}
                  <span class="text-[10px] sm:text-xs text-gray-500 font-normal">/ each</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Summary (aligned with the title on lg+) -->
      <aside class="mt-6 lg:mt-0 lg:col-span-1 lg:self-start">
        <div
          class="w-full rounded-xl ring-1 ring-gray-200 shadow-sm bg-white p-4 sm:p-5 lg:sticky space-y-4"
          style="top: var(--app-header-h, 1.5rem);" >  
          <!-- Delivery -->
          <details class="lg:open" open>
            <summary class="list-none cursor-pointer flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">Delivery</h3>
              <span class="lg:hidden text-xs text-gray-500">tap to expand</span>
            </summary>
            <div class="mt-2 space-y-2">
              <label
                class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm"
                :class="cart.deliveryMethod === 'ship' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'"
              >
                <input type="radio" value="ship" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
                Ship to Address
              </label>
              <label
                class="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm"
                :class="cart.deliveryMethod === 'pickup' ? 'border-teal-500 bg-teal-50/40' : 'border-gray-200'"
              >
                <input type="radio" value="pickup" v-model="cart.deliveryMethod" class="accent-[#00bfa5]" />
                Local Pickup
              </label>
            </div>
          </details>

          <!-- Address -->
          <details v-if="cart.deliveryMethod === 'ship'" class="lg:open" open>
            <summary class="list-none cursor-pointer mt-1 flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">Shipping Address</h3>
            </summary>
            <div class="mt-2">
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
                  <button type="button" @click="showAddressModal = true" class="text-xs text-teal-700 hover:underline">
                    Add new address
                  </button>
                </div>
                <div v-else class="text-sm text-gray-600">
                  No addresses yet.
                  <button @click="showAddressModal = true" class="text-teal-700 hover:underline font-medium">
                    Add one
                  </button>
                </div>
              </template>
            </div>
          </details>

          <!-- Shipping options -->
          <details v-if="cart.deliveryMethod === 'ship' && cart.selectedAddressId" class="lg:open" open>
            <summary class="list-none cursor-pointer mt-1 flex items-center justify-between">
              <h3 class="text-sm sm:text-base font-bold text-gray-800">Delivery Options</h3>
              <span v-if="quotesLoading" class="text-[11px] text-gray-500">Calculating…</span>
            </summary>
            <div class="mt-2">
              <div v-if="!quotesLoading && shippingOptions.length === 0" class="text-xs text-gray-500">
                No options for this address/cart.
              </div>
              <div
                v-for="opt in shippingOptions"
                :key="`${opt.shipper_id}-${opt.basis}-${opt.destination_id}`"
                class="mt-2 p-3 rounded-md border bg-white flex items-center justify-between text-sm"
                :class="selectedOption && selectedOption === opt ? 'border-teal-500' : 'border-slate-200'"
              >
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="shipOpt" :value="opt" v-model="selectedOption" class="accent-[#00bfa5]" />
                  <div class="font-medium">{{ opt.shipper_name }}</div>
                </label>
                <div class="font-semibold text-[#00bfa5]">
                  {{ opt.currency }} {{ opt.total_price }}
                </div>
              </div>
            </div>
          </details>

          <!-- Totals -->
          <div class="pt-2 border-t">
            <h3 class="text-sm sm:text-base font-bold text-gray-800 mb-2">Order Summary</h3>
            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between"><span>Subtotal</span><span>OMR {{ subtotal.toFixed(3) }}</span></div>
              <div class="flex justify-between"><span>Shipping</span><span>OMR {{ shippingCost.toFixed(3) }}</span></div>
              <div class="flex justify-between"><span>VAT (5%)</span><span>OMR {{ vat.toFixed(3) }}</span></div>
            </div>
            <hr class="my-3" />
            <div class="flex justify-between font-semibold text-base sm:text-lg text-[#00bfa5]">
              <span>Total</span>
              <span>OMR {{ grandTotal.toFixed(3) }}</span>
            </div>

            <button
              type="button"
              @click="goCheckout"
              class="mt-3 sm:mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135]
                     text-white text-center font-semibold py-2.5 rounded-md shadow transition disabled:opacity-60"
              :disabled="cart.cartItems.length === 0 || (cart.deliveryMethod === 'ship' && !selectedOption)"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile sticky bar (unchanged) -->
    <div
      class="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-6px_16px_rgba(15,23,42,0.05)]"
      v-if="cart.cartItems.length"
    >
      <div class="flex items-center justify-between">
        <div class="text-sm">
          <div class="text-slate-500">Total</div>
          <div class="font-semibold text-slate-900">OMR {{ grandTotal.toFixed(3) }}</div>
        </div>
        <button
          type="button"
          @click="goCheckout"
          class="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white
                 bg-[#2f5fb6] hover:bg-[#274f97] transition disabled:bg-gray-300"
          :disabled="cart.cartItems.length === 0 || (cart.deliveryMethod === 'ship' && !selectedOption)"
        >
          Checkout
        </button>
      </div>
      <div class="h-[env(safe-area-inset-bottom)]"></div>
    </div>
  </section>

  <!-- Address Modal (unchanged content) -->
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
      <div class="absolute inset-0 bg-black/40" @click="showAddressModal = false"></div>

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

          <!-- Body (unchanged form) -->
          <form @submit.prevent="submitAddress" class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
             <!-- Country -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <div class="relative">
              <select
                v-model="form.Country_Id"
                @change="onCountryChange"
                :class="selectCls"
              >
                <option value="">-- Select Country --</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.Country_Name }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- Region -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Region</label>
            <div class="relative">
              <select v-model="form.Region_Id" :class="selectCls">
                <option value="">-- Select Region --</option>
                <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.Region_Name }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- District -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">District</label>
            <div class="relative">
              <select v-model="form.District_Id" @change="onDistrictChange" :class="selectCls">
                <option value="">-- Select District --</option>
                <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.District_Name }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- City -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">City</label>
            <div class="relative">
              <select v-model="form.City_Id" :class="selectCls">
                <option value="">-- Select City --</option>
                <option v-for="ci in cities" :key="ci.id" :value="ci.id">{{ ci.City_Name }}</option>
              </select>
              <ChevronDown />
            </div>
          </div>

          <!-- Contact Person -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
            <input v-model.trim="form.Contact_Person_Name" :class="inputCls" type="text" />
          </div>

          <!-- Telephone -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
            <input v-model.trim="form.Telephone" :class="inputCls" type="text" />
          </div>

          <!-- Designation -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Designation</label>
            <select v-model="form.Designation" :class="selectCls">

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

          <!-- Email -->
          <div class="md:col-span-1">
            <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input v-model.trim="form.Email" :class="inputCls" type="email" />
          </div>

          <!-- Remarks -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea v-model.trim="form.Remarks" :class="textareaCls" rows="3"></textarea>
          </div>

          <!-- Footer -->
          <div class="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-teal-600 hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
              :disabled="submitting"
            >
              <span v-if="submitting" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              {{ isEdit ? 'Save Changes' : 'Save' }}
            </button>
          </div>
          </form>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

