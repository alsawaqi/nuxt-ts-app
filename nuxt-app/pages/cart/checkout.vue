<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})


import { useCartStore } from '~/stores/cart'
import { computed } from 'vue'
import { useToast } from 'vue-toastification'

const { $axios, $r2Url } = useNuxtApp()

interface OrderPayload {
  customer_id: number
  delivery_method: 'ship' | 'pickup'
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

const submitOrder = async () => {

      if (cart.cartItems.length === 0 || isSubmitting.value) return

  isSubmitting.value = true
  try {
    const payload: OrderPayload = {
      customer_id: 1, // Replace with actual customer ID
      delivery_method: cart.deliveryMethod,
      shipping_cost: shippingCost.value,
      cart_items: cart.cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        vat: 0, // Set as needed
      })),
    }

    const response = await $axios.post('/api/orders/place', payload)

    if (response.status === 200) {
      // ✅ Clear cart and show success
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
</script>
<template>

<section class="max-w-screen-xl mx-auto px-4 py-8 bg-white" v-if="isSuccess">
<h2 class="text-2xl font-bold text-green-600 mb-4">🎉 Order Placed Successfully!</h2>
  <p class="text-gray-700 mb-6">Thank you for your order. You will receive an email confirmation shortly.</p>
  <NuxtLink to="/" class="inline-block bg-[#00bfa5] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#00a388] transition">
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
        <!-- Purchase Order Number -->
        <div>
          <h2 class="text-xl font-semibold mb-2">Checkout</h2>
          <label class="block text-sm font-medium text-gray-700 mb-1">Purchase Order Number (Optional)</label>
          <input
            type="text"
            placeholder="PO Number"
            class="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <!-- Shipping -->
        <div>
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-gray-800 mb-1">Ship</h3>
               
              <p class="text-sm text-gray-600">Muscat, Oman</p>
            </div>
            <button class="text-sm text-[#00bfa5] hover:underline">Change</button>
          </div>
          <div class="mt-3 text-sm text-gray-700">
            <p class="mb-1 font-medium">Ground - Standard</p>
            <p>Order arrives between <strong>Wed. Jul 16</strong> - <strong>Thu. Jul 17</strong></p>
            <p class="text-[#00bfa5] font-semibold mt-1">OMR {{ shippingCost.toFixed(2) }}</p>
          </div>
        </div>

        <!-- Payment -->
        <div>
          <h3 class="font-semibold text-gray-800 mb-2">Add Payment Method</h3>
          <p class="text-sm text-gray-600">No saved payment methods.</p>
          <button class="mt-2 text-sm text-[#00bfa5] hover:underline">Add</button>
        </div>

        <!-- Products -->
        <div>
          <h3 class="font-semibold text-gray-800 mb-2">Products</h3>
          <div
            v-for="item in cart.cartItems"
            :key="item.id"
            class="flex justify-between items-center border-t py-4"
          >
            <div class="flex gap-4">
              <img
                :src="`${$r2Url}/${item.image}`"
                alt="product"
                class="w-16 h-16 object-cover rounded border"
              />
              <div class="text-sm">
                <p class="font-semibold text-gray-800">{{ item.name }}</p>
                <p class="text-xs text-gray-500 mt-1">Qty: {{ item.quantity }}</p>
                <p class="text-xs text-gray-500 mt-1">OMR {{ item.price.toFixed(2) }} / each</p>
              </div>
            </div>
            <p class="text-sm font-semibold text-gray-800">
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
            <span>OMR {{ cart.totalPrice().toFixed(2) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax</span>
            <span>TBD</span>
          </div>
          <div class="flex justify-between">
            <span>Shipping</span>
            <span>OMR {{ shippingCost.toFixed(2) }}</span>
          </div>
          <hr class="my-3" />
          <div class="flex justify-between font-semibold text-[#00bfa5] text-base">
            <span>Total</span>
            <span>OMR {{ (cart.totalPrice() + shippingCost).toFixed(2) }}</span>
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


