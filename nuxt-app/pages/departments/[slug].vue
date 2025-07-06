<script setup lang="ts">
  definePageMeta({
    layout: 'layouts',
  })
import { ref, watch, onMounted } from 'vue'
const { $axios ,$r2Url } = useNuxtApp();

  const showFilters = ref<boolean>(false);
  const slug = useParam('slug')
  const isloadingsubsubdepartments = ref<boolean>(true);


 interface FilterValue {
  id: number;
  product_id: string;
  product_specification_description_id: string;
  value: string;
}

interface FilterCategory {
  id: number;
  name: string;
  product_sub_sub_department_id: string;
  values: FilterValue[];
}

interface SubSubDepartment {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_path: string;
}

interface SubSubDepartmentResponse {
  data: SubSubDepartment;
  filters: FilterCategory[];
}

const subsubdepartment = ref<SubSubDepartment | null>(null)
const filters = ref<FilterCategory[]>([])

// Holds the selected filter values for each filter category
const selectedFilters = ref<Record<number, string[]>>({});

const getDepartment = async (): Promise<void> => {
  isloadingsubsubdepartments.value = true;

  try {
    const response = await $axios.get<SubSubDepartmentResponse>(`/api/subsubdepartments/${slug}`);
    
    subsubdepartment.value = response.data.data;
    filters.value = response.data.filters;
    // Optional: Initialize selected filter structure
    for (const filter of filters.value) {
      selectedFilters.value[filter.id] = []
    }

    console.log('Fetched department:', subsubdepartment.value)
    console.log('Fetched filters:', filters.value)
  } catch (error) {
    console.error('Error fetching department:', error)
  } finally {
    isloadingsubsubdepartments.value = false;
  }
};



   watch(showFilters, (val) => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = val ? 'hidden' : ''
    }
  });

  onMounted(async () => {
    await getDepartment();
  }); 



</script>
<template>
  

 


 <section class="bg-white py-6 px-4 max-w-screen-xl mx-auto">
  <div class="flex flex-col md:flex-row gap-6">

      <!-- Mobile Drawer Overlay -->
    <div
      v-if="showFilters"
      @click="showFilters = false"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
    >
    </div>


    <!-- Mobile Filter Toggle Button -->
    <div class="md:hidden px-4 mb-4">
      <button
        @click="showFilters = true"
        class="bg-gray-800 text-white px-4 py-2 rounded font-semibold shadow"
      >
        ☰ Filter
      </button>
    </div>

     <!-- Mobile Filter Drawer -->
      <div
        class="fixed top-0 left-0 w-72 h-full bg-white shadow-lg z-50 transition-transform duration-300 transform md:hidden"
        :class="showFilters ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="font-bold text-lg">Filters</h3>
          <button
            @click="showFilters = false"
            class="text-gray-700 border border-gray-300 px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div class="p-4 space-y-6 overflow-y-auto">
          <!-- Copy your filter groups here (Termination, Color, etc.) -->
            <div v-for="category in filters" :key="category.id">
          <h3>{{ category.name }}</h3>
          <div class="space-y-1">
            <label
              v-for="option in category.values"
              :key="option.id"
              class="block"
            >
              <input
                type="checkbox"
                class="mr-2"
                :value="option.value"
                v-model="selectedFilters[category.id]"
              />
              {{ option.value }}
            </label>
          </div>
       </div>

          <!-- Add more filter groups here -->
        </div>
      </div>

     <!-- Sidebar Filters -->
    <aside class="hidden md:block w-full md:w-1/4 border border-gray-200 p-4 rounded shadow-sm space-y-6">
      <h2 class="text-lg font-semibold">Filters</h2>

     

    <hr class="my-4 border-gray-300">

      <div v-for="category in filters" :key="category.id">
          <h3>{{ category.name }}</h3>
          <div class="space-y-1">
            <label
              v-for="option in category.values"
              :key="option.id"
              class="block"
            >
              <input
                type="checkbox"
                class="mr-2"
                :value="option.value"
                v-model="selectedFilters[category.id]"
              />
              {{ option.value }}
            </label>
          </div>
            <hr class="my-4 border-gray-300">
       </div>

     

      
    </aside>

    <!-- Main Content -->
    <main class="w-full md:w-3/4 space-y-6">
      <!-- Title -->
      <div>
        <h1 class="text-2xl font-bold mb-2">
          {{subsubdepartment?.name }}
        </h1>
        <p class="text-sm text-gray-700">
          {{ subsubdepartment?.description }}
         </p>
      </div>

      <!-- Product Types -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="border rounded p-4 flex flex-col items-center text-center">
          <img :src="`${$r2Url}/` + subsubdepartment?.image_path" alt="Insulated" class="h-16 mb-2">
         
        </div>
        
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