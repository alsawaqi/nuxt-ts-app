<script setup lang="ts">
definePageMeta({
    layout: 'layouts',
  })
import { ref } from 'vue'

const quantity = ref(1)

const addToCart = () => {
  alert(`Added ${quantity.value} item(s) to cart.`)
}
</script>
<template>
  <section class="max-w-screen-xl mx-auto p-6 bg-white">
    <!-- Top Section -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 border-b pb-6">
      <!-- Image -->
      <div class="flex justify-center">
        <img
          src="https://via.placeholder.com/300x300.png?text=Product+Image"
          alt="Product"
          class="w-full max-w-xs border rounded shadow-md"
        />
      </div>

      <!-- Title & Info -->
      <div class="md:col-span-2 space-y-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">
            HUBBELL WIRING DEVICE-KELLEMS Floor Box Cover
          </h1>
          <p class="text-sm text-gray-500">Item Code: 4D508 | Model: S2925</p>
        </div>

        <!-- Price & Add to Cart -->
        <div class="bg-gray-100 p-4 rounded-md shadow-sm w-full max-w-md">
          <div class="text-2xl font-semibold text-green-700 mb-2">$62.11</div>

          <div class="flex items-center gap-4 mb-4">
            <input
              type="number"
              v-model="quantity"
              class="border px-3 py-2 w-20 rounded"
              min="1"
            />
            <button
              @click="addToCart"
              class="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded shadow-md transition"
            >
              Add to Cart
            </button>
          </div>

          <p class="text-xs text-gray-600">Shipping Weight: 0.6 lbs</p>
        </div>
      </div>
    </div>

    <!-- Product Details Section -->
    <section class="mt-8">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Product Details</h2>

      <div class="grid md:grid-cols-2 gap-8 text-sm text-gray-700">
        <!-- Left Column -->
        <div class="space-y-2">
          <div><strong>Brand:</strong> HUBBELL WIRING DEVICE-KELLEMS</div>
          <div><strong>Manufacturer Part Number:</strong> S2925</div>
          <div><strong>Color:</strong> Gold</div>
          <div><strong>Compatible Series:</strong> B24</div>
          <div><strong>Cover Shape:</strong> Round</div>
          <div><strong>Finish:</strong> Brushed</div>
          <div><strong>Material:</strong> Brass</div>
        </div>

        <!-- Right Column -->
        <div class="space-y-2">
          <div><strong>Number of Gangs:</strong> 1</div>
          <div><strong>Diameter:</strong> 3-7/8 in</div>
          <div><strong>Height:</strong> 1/8 in</div>
          <div><strong>Standards:</strong> UL 514; UL/CSA</div>
          <div><strong>UNSPSC:</strong> 39121307</div>
          <div><strong>Country of Origin:</strong> USA</div>
        </div>
      </div>
    </section>

    <!-- Product Description -->
    <section class="mt-10">
      <h2 class="text-lg font-semibold text-gray-800 mb-2">Product Description</h2>
      <p class="text-sm text-gray-700 leading-relaxed">
        Brass electrical floor box covers are the most commonly used style. They install in homes or buildings over a
        compatible, same-branded floor box to protect in-floor electrical outlets from damage and short circuits. Brass
        electrical floor boxes are durable when compared to nonmetallic floor boxes.
      </p>
    </section>
  </section>
</template>


