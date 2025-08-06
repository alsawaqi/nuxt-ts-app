<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})


import { useCartStore } from '~/stores/cart'
import { useUserStore } from '~/stores/user'
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'vue-toastification'


const { user, isAuthenticated } = useAuth()

const { $axios, $r2Url } = useNuxtApp()

interface OrderPayload {
  customer_id: number
  delivery_method: 'ship' | 'pickup'
  Customers_Contacts_Id: number | null // ✅ Nullable for pickup
  shipping_cost: number
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
const cart = useCartStore()
const shippingCost = computed(() => {
  return cart.deliveryMethod === 'ship' ? 2: 0
})// could be dynamic later

const toast = useToast()


const selectedAddress = ref<any>(null)

const fetchSelectedAddress = async () => {
  if (cart.deliveryMethod !== 'ship') return

  const id = localStorage.getItem('selected_address_id')
  if (!id) return

  try {
    const res = await $axios.get(`/api/contacts/${id}`)
    selectedAddress.value = res.data
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

    const payload: OrderPayload = {
      customer_id: 1,  // Replace with actual customer logic
      delivery_method: cart.deliveryMethod,
      shipping_cost: shippingCost.value,
      Customers_Contacts_Id: cart.deliveryMethod === 'ship' ? addressId : null, // ✅ attach it conditionally
      cart_items: cart.cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        vat: 0,
      })),
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

onMounted(fetchSelectedAddress)
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

  <!-- ✅ Shipping Info -->
 <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
  <div class="flex justify-between items-start mb-2">
    <div>
      <h3 class="font-semibold text-gray-800 text-lg mb-1">📦 Shipping To</h3>
      <p class="text-sm text-gray-600" v-if="selectedAddress">
        {{ selectedAddress.Contact_Person_Name }}<br>
        {{ selectedAddress.Telephone }}<br>
        {{ selectedAddress.City?.City_Name }}, {{ selectedAddress.State?.State_Name }}, {{ selectedAddress.Country?.Country_Name }}
      </p>
      <p class="text-sm text-gray-400" v-else>
        No address selected
      </p>
    </div>
    <button class="text-sm text-[#00bfa5] hover:underline">Change</button>
  </div>
  <div class="mt-3 text-sm text-gray-700">
    <p class="mb-1 font-medium">Ground Shipping - Standard</p>
    <p>Estimated Delivery: <strong>Wed. Jul 16</strong> - <strong>Thu. Jul 17</strong></p>
    <p class="text-[#00bfa5] font-semibold mt-1">Shipping Cost: OMR {{ shippingCost }}</p>
  </div>
</div>


  <!-- ✅ Payment Method -->
  <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
    <h3 class="font-semibold text-gray-800 text-lg mb-2">💳 Payment Method</h3>
    <p class="text-sm text-gray-600">No saved payment methods available.</p>
    <button class="mt-2 text-sm text-[#00bfa5] hover:underline">+ Add Payment Method</button>
  </div>

  <!-- ✅ Products Review -->
  <div class="bg-[#f9f9f9] border border-gray-200 rounded-lg p-5 shadow-sm">
    <h3 class="font-semibold text-gray-800 text-lg mb-4">🛒 Items in Your Order</h3>
    <div
      v-for="item in cart.cartItems"
      :key="item.id"
      class="flex justify-between items-center border-t pt-4 pb-5 first:border-t-0"
    >
      <div class="flex gap-4">
        <img :src="`${$r2Url}/${item.image}`" alt="product" class="w-16 h-16 object-cover rounded border" />
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
</div>


      <!-- Right Column: Order Summary -->
      <div class="bg-gray-50 border rounded-lg p-5 shadow-sm">
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
            <span>OMR {{ (cart.totalPrice() + shippingCost) }}</span>
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

        <!-- Promo Code -->
        <button class="mt-4 text-sm text-[#00bfa5] hover:underline">+ Add Promo Code</button>
        <p class="mt-3 text-xs text-gray-500">
          Availability, shipping, tax & promotions are not final until your order has been processed.
        </p>
      </div>
    </div>
  </section>
</template>


