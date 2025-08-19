

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

 


// You can dynamically compute shippingCost
const shippingCost = computed(() => {
  return cart.deliveryMethod === 'ship' ? 2 : 0
})

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



onMounted(() => {
  if (isAuthenticated.value === true) {
    fetchAddresses();
    loadCountries();
    loadRegions();
    loadDistricts();
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
        <h2 class="font-semibold text-gray-700 mb-3">Delivery Method</h2>
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

 <div>
  <h2 class="font-semibold text-gray-700 mb-3">Shipping Address</h2>

  <div v-if="!isAuthenticated">
 
    <p class="text-sm text-gray-500">Please login to select a shipping address.</p>
    <NuxtLink to="/login" class="text-[#00bfa5] hover:underline">Login</NuxtLink>

  </div> 

  <div v-if="addresses.length > 0 && isAuthenticated" class="space-y-2">
    <label
      v-for="addr in addresses"
      :key="addr.id"
      class="flex items-center border border-gray-300 rounded-lg px-4 py-2 cursor-pointer hover:border-[#00bfa5] transition"
    >
      <input
        type="radio"
        name="selectedAddress"
        :value="addr.id"
        v-model="cart.selectedAddressId"
      />
      <div>
        <p class="font-medium text-gray-800">{{ addr.Contact_Person_Name || 'Unnamed Address' }}</p>
        <p class="text-sm text-gray-600">
          {{ addr.country?.Country_Name }}, {{ addr.state?.State_Name }}, {{ addr.city?.City_Name }}
        </p>
        <p class="text-xs text-gray-500">Tel: {{ addr.Telephone || addr.Gsm }}</p>
      </div>
    </label>
  </div>

  <!-- If no addresses -->
  <p v-else-if="isAuthenticated" class="text-sm text-gray-500">No saved addresses. Please add one.</p>

  <!-- Add New Address Button -->
  <button
    @click="showAddressModal = true"
    class="mt-3 bg-[#00bfa5] text-white px-4 py-2 rounded-md hover:bg-[#009d8d] transition"
    v-if="isAuthenticated"
  >
    + Add New Address
  </button>



</div>

    </div>

    <!-- Products -->
    <div class="border rounded-xl shadow-sm mb-10">
      <div class="flex justify-between items-center px-6 py-4 border-b bg-[#f9f9f9]">
        <h2 class="font-semibold text-gray-800 text-lg">Items in Cart</h2>
        <button
          @click="onClearCart"
          class="flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-md text-sm transition"
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
        class="flex justify-between items-center px-6 py-6 border-b hover:bg-gray-50 transition group"
      >
        <div class="flex items-start gap-x-5">
          <NuxtLink :to="`/product/${item.slug}`">
            <img :src="`${$r2Url}/${item.image}`" alt="Product" class="w-20 h-20 object-cover border rounded-lg shadow-sm group-hover:scale-105 transition" />
          </NuxtLink>
          <div>
            <h3 class="font-medium text-gray-800">{{ item.name }}</h3>
            <p class="text-xs text-gray-500">Item #{{ item.id }}</p>
            <p class="text-xs text-gray-500 mt-1">Expected by <span class="font-semibold">Wed. Jul 16</span></p>
            <button @click="cart.removeFromCart(item.id)" class="text-sm text-[#00bfa5] hover:underline mt-2">Remove</button>
          </div>
        </div>
       <div class="text-right">
  <label class="text-sm font-semibold text-gray-600 block mb-1">Quantity</label>

  <div class="flex items-center justify-end space-x-1">
    <!-- Decrement Button -->
    <button
      @click="decrementQty(item.id)"
      class="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition"
    >
      −
    </button>

    <!-- Quantity Input -->
    <input
      type="number"
      min="1"
      v-model.number="item.quantity"
      @change="onQtyInputChange($event, item.id)"
      class="w-16 border rounded-md text-center text-sm py-1.5 px-2"
    />

    <!-- Increment Button -->
    <button
      @click="incrementQty(item.id)"
      class="px-2 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition"
    >
      +
    </button>
  </div>

  <p class="text-sm text-green-700 font-semibold mt-2">
    OMR {{ item.price }} <span class="text-xs text-gray-500 font-normal">/ each</span>
  </p>
</div>

      </div>
    </div>

    <!-- Summary -->
    <div class="flex justify-end">
      <div class="w-full max-w-sm border rounded-xl shadow-lg bg-[#fafafa] p-6">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span>Subtotal</span><span>OMR {{ cart.totalPrice().toFixed(2) }}</span></div>
          <div class="flex justify-between"><span>Tax</span><span>N/A</span></div>
          <div class="flex justify-between"><span>Shipping</span><span>OMR {{ shippingCost.toFixed(2) }}</span></div>
        </div>
        <hr class="my-3" />
        <div class="flex justify-between font-semibold text-lg text-[#00bfa5]">
          <span>Total</span>
          <span>OMR {{ (cart.totalPrice() + shippingCost).toFixed(2) }}</span>
        </div>
        <NuxtLink
          :to="'/cart/checkout'"
          class="block mt-6 w-full bg-gradient-to-r from-[#00bfa5] to-[#88c547] hover:from-[#00a891] hover:to-[#76b135] text-white text-center font-semibold py-2.5 rounded-md shadow transition"
          :disabled="cart.cartItems.length === 0"
        >
          Proceed to Checkout
        </NuxtLink>
      </div>
    </div>
  </section>

  <!-- Address Modal -->
<transition name="fade">
  <div v-if="showAddressModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h3 class="text-xl font-semibold mb-4">Add New Address</h3>

      <form @submit.prevent="submitAddress" class="space-y-3">
        <!-- Country -->
        <div>
          <label class="block text-sm font-medium mb-1">Country</label>
          <select v-model="newAddress.Country_Id" @change="loadStates" class="w-full border rounded p-2">
            <option value="">-- Select Country --</option>
            <option v-for="c in countries" :key="c.id" :value="c.id">
              {{ c.Country_Name }}
            </option>
          </select>
        </div>

        <!-- Region -->
        <div>
          <label class="block text-sm font-medium mb-1">Regions</label>
          <select v-model="newAddress.Region_Id"  class="w-full border rounded p-2">
            <option value="">-- Select Regions --</option>
            <option v-for="r in  regions" :key="r.id" :value="r.id">
              {{ r.Region_Name }}
            </option>
          </select>
        </div>


        <!-- District  -->
        <div>
          <label class="block text-sm font-medium mb-1">District</label>
          <select v-model="newAddress.District_Id" @change="loadCities" class="w-full border rounded p-2">
            <option value="">-- Select District --</option>
            <option v-for="d in districts" :key="d.id" :value="d.id">
              {{ d.District_Name }}
            </option>
          </select>
        </div>

        <!-- City -->
        <div>
          <label class="block text-sm font-medium mb-1">City</label>
          <select v-model="newAddress.City_Id" class="w-full border rounded p-2">
            <option value="">-- Select City --</option>
            <option v-for="ci in cities" :key="ci.id" :value="ci.id">
              {{ ci.City_Name }}
            </option>
          </select>
        </div>

        <!-- Contact Person -->
        <div>
          <label class="block text-sm font-medium mb-1">Contact Person</label>
          <input v-model="newAddress.Contact_Person_Name" class="w-full border rounded p-2" type="text" />
        </div>

        <!-- Telephone -->
        <div>
          <label class="block text-sm font-medium mb-1">Telephone</label>
          <input v-model="newAddress.Telephone" class="w-full border rounded p-2" type="text" />
        </div>

        <!-- Designation -->
        <div>
          <label class="block text-sm font-medium mb-1">Designation</label>
          <input v-model="newAddress.Designation" class="w-full border rounded p-2" type="text" />
        </div>    

        <!-- Remarks -->
        <div>
          <label class="block text-sm font-medium mb-1">Remarks</label>
          <textarea v-model="newAddress.Remarks" class="w-full border rounded p-2" rows="3"></textarea>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end gap-3 mt-4">
          <button type="button" @click="showAddressModal = false" class="px-4 py-2 border rounded">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-[#00bfa5] text-white rounded">
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</transition>

</template>

