

<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
})
import { useCartStore } from '~/stores/cart'
const { $r2Url } = useNuxtApp();

const cart = useCartStore()



 


 

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


</script>

<template>
  <section class="bg-white py-10 px-4 max-w-screen-xl mx-auto">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Cart</h1>

    <!-- Delivery Method + Availability -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-5 mb-8">
      <div>
        <h2 class="font-semibold text-gray-700 mb-2">Delivery Method</h2>


         <div class="space-y-2">
  <label class="flex items-center border rounded-md p-3 cursor-pointer">
    <input
      type="radio"
      name="delivery"
      value="ship"
      v-model="cart.deliveryMethod"
      class="mr-3 text-[#00bfa5]"
    />
    Ship
  </label>

  <label class="flex items-center border rounded-md p-3 cursor-pointer">
    <input
      type="radio"
      name="delivery"
      value="pickup"
      v-model="cart.deliveryMethod" 
      class="mr-3 text-[#00bfa5]"
    />
    Pickup
  </label>
</div>

      </div>

      <div>
        <h2 class="font-semibold text-gray-700 mb-2">Ship Availability</h2>
        <p class="text-sm text-gray-600">
          Showing product availability for <span class="font-semibold text-[#00bfa5]">ZIP Code 60045</span>
        </p>
        <button class="text-sm text-[#00bfa5] underline mt-2">Change</button>
      </div>
    </div>

    <!-- My Products -->
    <div class="border rounded-lg">
      <div class="flex justify-between items-center px-5 py-3 border-b">
        <h2 class="font-semibold text-gray-700">My Products</h2>
        <div class="flex items-center gap-x-6">
          <button
  @click="onClearCart"
  class="flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-md text-sm font-medium transition"
>
  <svg
    class="w-4 h-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
  Clear Cart
</button>
           
        </div>
      </div>

      <div v-for="item in cart.cartItems" :key="item.id" class="flex justify-between items-center px-5 py-6 border-b">
        <div class="flex items-start gap-x-4">
          <img :src="`${$r2Url}/${item.image}`" alt="Product" class="w-20 h-20 rounded-lg border" />
          <div>
            <h3 class="font-semibold text-sm text-gray-800">{{ item.name }}</h3>
            <p class="text-xs text-gray-500 mt-1">Item #{{ item.id }}</p>
            <p class="text-xs text-gray-500 mt-1">Expected to arrive <span class="font-semibold text-gray-700">Wed. Jul 16</span></p>
            <button @click="cart.removeFromCart(item.id)" class="text-sm text-[#00bfa5] mt-2 hover:underline">Remove</button>
          </div>
        </div>
        <div class="text-right">
          <label class="text-sm font-semibold text-gray-600 block mb-1">Qty</label>
          <input
            type="number"
            min="1"
            v-model="item.quantity"
             @change="onQtyInputChange($event, item.id)"
            class="w-16 border rounded-md text-center text-sm py-1 px-2"
          />
          <p class="text-sm text-green-600 font-bold mt-2">
            OMR {{ (item.price).toFixed(2) }} <span class="text-xs text-gray-500 font-normal">/ each</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="mt-10 flex justify-end">
      <div class="w-full max-w-sm border rounded-lg shadow-md">
        <div class="p-5">
          <h2 class="text-lg font-semibold mb-4">Order Summary</h2>
          <div class="flex justify-between text-sm mb-2">
            <span>Subtotal</span>
            <span>OMR {{ cart.totalPrice().toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm mb-2">
            <span>Estimated Tax</span>
            <span>N/A</span>
          </div>
          <div class="flex justify-between text-sm mb-2">
            <span>Estimated Shipping</span>
            <span>OMR {{ shippingCost.toFixed(2) }}</span>
          </div>
          <hr class="my-3" />
          <div class="flex justify-between font-semibold text-lg text-[#00bfa5]">
            <span>Estimated Total</span>
            <span>OMR {{ (cart.totalPrice() + shippingCost).toFixed(2) }}</span>
          </div>
          <NuxtLink :to="'/cart/checkout'"

             class="mt-6 w-full bg-[#e53935] hover:bg-[#c62828] text-white font-semibold py-2 rounded-lg text-sm transition"
         
           :disabled="cart.cartItems.length === 0"
          >
            Proceed to Checkout
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
