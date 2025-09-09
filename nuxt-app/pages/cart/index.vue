

<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
})
import { useCartStore } from '~/stores/cart'
import { useUserStore } from '~/stores/user'



const { $r2Url ,$axios } = useNuxtApp();

const cart = useCartStore();
const { user, isAuthenticated } = useAuth()


const addresses = ref<any[]>([])
const selectedAddressId = ref<number | null>(null)

const fetchAddresses = async () => {
  if (!isAuthenticated) return  

  try {
    const res = await $axios.get('/api/contacts')
    addresses.value = res.data
    if (addresses.value.length > 0) {
      selectedAddressId.value = addresses.value[0].id
    }
  } catch (e) {
    console.error('Failed to fetch addresses', e)
  }
}


const showAddressModal = ref(false)
const countries = ref<any[]>([])
const regions = ref<any[]>([])
const districts = ref<any[]>([])
const states = ref<any[]>([])
const cities = ref<any[]>([])

const newAddress = reactive({
  Country_Id: '',
  State_Id: '',
  City_Id: '',
  Region_Id: '',
  District_Id: '',
  Contact_Person_Name: '',
  Telephone: '',
  Designation: '',
  Remarks: '',
})

const loadCountries = async () => {
 if (!isAuthenticated) return 


  const res = await $axios.get('/api/countries')
  countries.value = res.data
}



const loadRegions = async () => {
 
  const res = await $axios.get('/api/region')
  regions.value = res.data.data
}


const loadDistricts = async () => {
 
  const res = await $axios.get('/api/district')
  districts.value = res.data.data
}

const loadStates = async () => {
  states.value = []
  cities.value = []
  if (!newAddress.Country_Id) return
  const res = await $axios.get(`/api/contacts/by-country/${newAddress.Country_Id}`)
  states.value = res.data
}

const loadCities = async () => {
 
    
 
    

  const res = await $axios.get(`/api/contacts/by-state/${newAddress.District_Id}`)
  cities.value = res.data
}

const submitAddress = async () => {
  try {
    await $axios.post('/api/contacts', newAddress)
    showAddressModal.value = false
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to save address', e)
  }
}

 


 
const onQtyInputChange = (event: Event, id: number) => {
  const input = event.target as HTMLInputElement
  const value = input.valueAsNumber
  if (value > 0) cart.updateQuantity(id, value)
}

const onRemove = (id: number) => {
  cart.removeFromCart(id)
}

const onClearCart = () => {
  cart.clearCart()
}


const incrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item) item.quantity++
}

const decrementQty = (id: number) => {
  const item = cart.cartItems.find(i => i.id === id)
  if (item && item.quantity > 1) item.quantity--
}



onMounted(async () => {
  if (isAuthenticated.value === true) {
        await fetchAddresses();
        await loadCountries();
        await loadRegions();
        await loadDistricts();
  }
})

</script>

<template>
  <section class="bg-white py-10 px-4 max-w-screen-xl mx-auto font-sans">
    <h1 class="text-3xl font-bold mb-6 text-gray-800 tracking-wide">
      <span class="text-gradient">Your Cart</span>
    </h1>

    <!-- Delivery Method -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 border border-[#00bfa5]/20 rounded-xl p-6 shadow-sm mb-10 bg-white animate-fade-in">
      <div>
        <h2 class="font-semibold text-gray-700 mb-3">Delivery Method {{ cart.deliveryMethod }}</h2>
        <div class="space-y-3">
          <label class="flex items-center border border-[#00bfa5]/40 hover:border-[#00bfa5] rounded-lg px-4 py-2 cursor-pointer transition">
            <input type="radio" name="delivery" value="ship" v-model="cart.deliveryMethod" class="accent-[#00bfa5] mr-3" />
            Ship to Address
          </label>
          <label class="flex items-center border border-[#00bfa5]/40 hover:border-[#00bfa5] rounded-lg px-4 py-2 cursor-pointer transition">
            <input type="radio" name="delivery" value="pickup" v-model="cart.deliveryMethod" class="accent-[#00bfa5] mr-3" />
            Local Pickup
          </label>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
  <div class="flex items-center justify-between mb-4">
    <h2 v-if="cart.deliveryMethod === 'ship'" class="text-lg font-semibold text-gray-900">
      Shipping Address
    </h2>
    <span
      v-if="isAuthenticated && cart.deliveryMethod === 'ship' && addresses.length"
      class="text-xs text-gray-500"
    >
      {{ addresses.length }} saved
    </span>
  </div>

  <!-- Ask to login -->
  <div v-if="!isAuthenticated">
    <p class="text-sm text-gray-600">
      Please log in to select a shipping address.
    </p>
    <NuxtLink to="/login" class="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 hover:underline">
      Login
      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 018.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
    </NuxtLink>
  </div>

  <!-- Address selector -->
  <template v-else-if="cart.deliveryMethod === 'ship'">
    <!-- With addresses -->
    <div v-if="addresses.length > 0" role="radiogroup" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label
        v-for="addr in addresses"
        :key="addr.id"
        class="cursor-pointer rounded-lg border bg-white p-4 transition
               hover:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400
               flex items-start gap-3"
        :class="cart.selectedAddressId === addr.id
                ? 'border-teal-500 ring-2 ring-teal-300 bg-teal-50/40'
                : 'border-gray-200'"
      >
        <!-- Visually-hidden radio -->
        <input
          type="radio"
          class="sr-only"
          name="selectedAddress"
          :value="addr.id"
          v-model="cart.selectedAddressId"
        />

        <!-- Custom radio dot -->
        <span
          class="mt-1 h-4 w-4 rounded-full border transition"
          :class="cart.selectedAddressId === addr.id
                  ? 'border-teal-600 ring-4 ring-teal-200 bg-teal-600'
                  : 'border-gray-300 bg-white'"
          aria-hidden="true"
        ></span>

        <div class="min-w-0">
          <p class="font-medium text-gray-900 truncate">
            {{ addr.Contact_Person_Name || 'Unnamed Address' }}
          </p>
          <p class="text-sm text-gray-600 truncate">
            {{ addr.country?.Country_Name }},
            {{ addr.state?.State_Name || addr.region?.Region_Name }},
            {{ addr.city?.City_Name }}
          </p>
          <p class="text-xs text-gray-500">Tel: {{ addr.Telephone || addr.Gsm }}</p>
        </div>

        <span
          v-if="cart.selectedAddressId === addr.id"
          class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700"
        >
          Selected
        </span>
      </label>

      <!-- Add new address tile -->
      <button
        type="button"
        @click="showAddressModal = true"
        class="min-h-[104px] flex items-center justify-center rounded-lg border-2 border-dashed
               border-gray-300 text-teal-700 hover:border-teal-500 hover:bg-teal-50/40 transition"
      >
        <span class="inline-flex items-center gap-2 font-semibold">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z"/>
          </svg>
          Add New Address
        </span>
      </button>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8">
      <div class="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-teal-50 text-teal-600">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v1.586l-.707.707A1 1 0 004 12h12a1 1 0 00.707-1.707L16 9.586V8a6 6 0 00-6-6z"/><path d="M4 13a3 3 0 003 3h6a3 3 0 003-3H4z"/></svg>
      </div>
      <p class="text-sm text-gray-600 mb-4">No saved addresses yet.</p>
      <button
        @click="showAddressModal = true"
        class="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-teal-600
               text-white px-4 py-2 font-medium shadow-sm hover:opacity-90 transition"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z"/></svg>
        Add New Address
      </button>
    </div>
  </template>
</div>


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
          <button @click="cart.removeFromCart(item.id)"
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
                 class="w-14 border rounded-md text-center text-sm py-1" />
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
    <div class="w-full border rounded-xl shadow-lg bg-[#fafafa] p-5 md:sticky md:top-24">
      <h2 class="text-base md:text-lg font-bold text-gray-800 mb-3">Order Summary</h2>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span>Subtotal</span>
          <span>OMR {{ cart.totalPrice().toFixed(2) }}</span>
        </div>
      </div>
      <hr class="my-3" />
      <div class="flex justify-between font-semibold text-lg text-[#00bfa5]">
        <span>Total</span>
        <span>OMR {{ (cart.totalPrice()).toFixed(2) }}</span>
      </div>
      <NuxtLink
        :to="'/cart/checkout'"
        class="block mt-4 w-full bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white text-center font-semibold py-2.5 rounded-md shadow transition disabled:opacity-60"
        :disabled="cart.cartItems.length === 0"
      >
        Proceed to Checkout
      </NuxtLink>
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

