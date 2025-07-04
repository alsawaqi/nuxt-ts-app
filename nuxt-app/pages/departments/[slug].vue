<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
})

</script>
<template>

  <section class="bg-white py-6 px-4 max-w-screen-xl mx-auto">
  <div class="flex flex-col md:flex-row gap-6">
    <!-- Sidebar Filters -->
    <aside class="w-full md:w-1/4 border border-gray-200 p-4 rounded shadow-sm space-y-6">
      <h2 class="text-lg font-semibold">Filters</h2>

      <!-- Termination Filter -->
      <div>
        <h3 class="font-semibold mb-2">Termination</h3>
        <div class="space-y-1">
          <label><input type="checkbox" class="mr-2">Crimp Termination & Heat Shrink</label>
          <label><input type="checkbox" class="mr-2">Crimp Termination Only</label>
        </div>
      </div>

      <!-- Insulation Material Filter -->
      <div>
        <h3 class="font-semibold mb-2">Insulation Material</h3>
        <div class="space-y-1">
          <label><input type="checkbox" class="mr-2">None</label>
          <label><input type="checkbox" class="mr-2">Nylon</label>
          <label><input type="checkbox" class="mr-2">Polyolefin</label>
          <label><input type="checkbox" class="mr-2">Vinyl</label>
        </div>
      </div>

      <!-- Insulation Color Filter -->
      <div>
        <h3 class="font-semibold mb-2">Insulation Color</h3>
        <div class="flex gap-2">
          <span class="w-4 h-4 rounded-full bg-gray-300 inline-block"></span>
          <span class="w-4 h-4 rounded-full bg-blue-500 inline-block"></span>
          <span class="w-4 h-4 rounded-full bg-red-500 inline-block"></span>
          <span class="w-4 h-4 rounded-full bg-yellow-400 inline-block"></span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="w-full md:w-3/4 space-y-6">
      <!-- Title -->
      <div>
        <h1 class="text-2xl font-bold mb-2">Fork Terminals</h1>
        <p class="text-sm text-gray-700">
          Fork terminals slide around and secure to screws or threaded connection points to create semipermanent connections.
        </p>
      </div>

      <!-- Product Types -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="border rounded p-4 flex flex-col items-center text-center">
          <img src="#" alt="Insulated" class="h-16 mb-2">
          <p class="text-sm">Insulated Fork Terminals</p>
        </div>
        <div class="border rounded p-4 flex flex-col items-center text-center">
          <img src="#" alt="Non-Insulated" class="h-16 mb-2">
          <p class="text-sm">Non-Insulated Fork Terminals</p>
        </div>
      </div>

      <!-- Sub Heading -->
      <div class="bg-yellow-100 border-l-4 border-yellow-400 p-4">
        <h2 class="font-bold mb-1">Insulated Fork Terminals</h2>
        <p class="text-sm text-gray-700">
          These fork terminals have insulation around their barrel that helps prevent wire strands from falling out...
        </p>
      </div>

      <!-- Table -->
      <div class="overflow-auto border border-gray-200 rounded shadow-sm">
        <table class="min-w-full text-sm text-left">
          <thead class="bg-gray-100 text-xs font-semibold">
            <tr>
              <th class="px-4 py-2 border-b">Size</th>
              <th class="px-4 py-2 border-b">Min Wire</th>
              <th class="px-4 py-2 border-b">Max Wire</th>
              <th class="px-4 py-2 border-b">Insulation</th>
              <th class="px-4 py-2 border-b">Shape</th>
              <th class="px-4 py-2 border-b">Voltage</th>
              <th class="px-4 py-2 border-b">Brand</th>
              <th class="px-4 py-2 border-b">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-2 border-b">#6</td>
              <td class="px-4 py-2 border-b">18 AWG</td>
              <td class="px-4 py-2 border-b">14 AWG</td>
              <td class="px-4 py-2 border-b">Nylon</td>
              <td class="px-4 py-2 border-b">Block Fork</td>
              <td class="px-4 py-2 border-b">600 V</td>
              <td class="px-4 py-2 border-b">3M</td>
              <td class="px-4 py-2 border-b text-blue-600 font-semibold">$106.99</td>
            </tr>
            <!-- More rows... -->
          </tbody>
        </table>
      </div>
    </main>
  </div>
</section>


 
 

</template>