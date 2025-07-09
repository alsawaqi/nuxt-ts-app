<script setup lang="ts">
  definePageMeta({
    layout: 'layouts',
  })
import { ref, watch, onMounted } from 'vue'
const { $axios ,$r2Url } = useNuxtApp();

  const showFilters = ref<boolean>(false);
  const slug = useParam('slug')
  const isloadingsubsubdepartments = ref<boolean>(true);
  const isloadingproducts = ref<boolean>(true);

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

interface ProductImage{
    image_path: string;
}


interface Products{
      id: string;
      name: string;
      price: number;
      slug: string;
      image: ProductImage | null;  
}

const subsubdepartment = ref<SubSubDepartment | null>(null)
const filters = ref<FilterCategory[]>([])
const products = ref<Products[]>([]);

// Holds the selected filter values for each filter category
const selectedFilters = ref<Record<number, string[]>>({});

const getDepartment = async (): Promise<void> => {
  isloadingsubsubdepartments.value = true;

  try {
    const response = await $axios.get<SubSubDepartmentResponse>(`/api/subsubdepartments/${slug}`);
    
    subsubdepartment.value = response.data.data;
    filters.value = response.data.filters;
   
    for (const filter of filters.value) {
      selectedFilters.value[filter.id] = []
    }

 
  } catch (error) {
    console.error('Error fetching department:', error)
  } finally {
    isloadingsubsubdepartments.value = false;
  }
};





const getProducts = async (): Promise<void> => {
  isloadingproducts.value = true;

  try {

     
         const spec_ids = Object.values(selectedFilters.value)
      .flat()
      .map(id => Number(id)); // Ensure they are numbers


    const response = await $axios.get<Products[]>(`/api/products/${slug}`, {
      params: {
        filters: selectedFilters.value,
         spec_ids: spec_ids,
      }
    });
    products.value = response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
    isloadingproducts.value = false;
  }
}




watch(selectedFilters, async(): Promise<void> => {
 await getProducts();
}, { deep: true });

 watch(showFilters, async(val): Promise<void> => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = val ? 'hidden' : ''
    }
  });



 onMounted(async () => {
    await getDepartment();
    await getProducts();
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
            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            :value="option.id"
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
    <aside class="hidden md:block w-full md:w-1/4">
  <div class="bg-white border border-gray-300 rounded-lg shadow-xl p-6 sticky top-6 space-y-6">

    <h2 class="text-xl font-bold text-gray-800 border-b pb-2">
      <i class="fas fa-filter mr-2"></i> Filters
    </h2>

    <div v-for="category in filters" :key="category.id" class="bg-gray-50 rounded-md p-4 shadow-sm">
      <h3 class="text-md font-semibold text-gray-700 mb-3">{{ category.name }}</h3>

      <div class="space-y-2">
        <label
          v-for="option in category.values"
          :key="option.id"
          class="flex items-center text-gray-700 hover:text-blue-600 transition"
        >
          <input
            type="checkbox"
            class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            :value="option.id"
            v-model="selectedFilters[category.id]"
          />
          <span class="text-sm">{{ option.value }}</span>
        </label>
      </div>
    </div>

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
    <div class="overflow-x-auto border border-gray-300 rounded-lg shadow-xl">
  <table class="min-w-full text-sm text-left bg-white rounded-lg">
    <thead class="bg-gradient-to-r from-cyan-400 via-lime-400 to-blue-600 text-white text-xs font-semibold uppercase tracking-wider">
      <tr>
        <th class="px-5 py-3 border-b">#</th>
        <th class="px-5 py-3 border-b">Image</th>
        <th class="px-5 py-3 border-b">Name</th>
        <th class="px-5 py-3 border-b">Price</th>
        <th class="px-5 py-3 border-b">Action</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(product, index) in products"
        :key="product.id"
        class="border-b hover:bg-blue-50 transition duration-150"
      >
        <td class="px-5 py-4 font-medium text-gray-800">{{ index + 1 }}</td>

        <td class="px-5 py-4">
          <div class="w-20 h-20 overflow-hidden rounded border border-gray-200">
            <img
              :src="product.image?.image_path ? `${$r2Url}/${product.image.image_path}` : 'https://via.placeholder.com/64'"
              alt="Product Image"
              class="object-cover w-full h-full"
            />
          </div>
        </td>

        <td class="px-5 py-4 text-gray-700">{{ product.name }}</td>
        <td class="px-5 py-4 text-gray-700 font-semibold">{{ product.price }} OMR</td>

       <td class="px-5 py-4">
  <NuxtLink
    :to="`/product/${product.slug}`"
    class="inline-block bg-gradient-to-r from-cyan-400   to-blue-600 text-white text-xs font-semibold px-5 py-2 rounded-md shadow-md hover:opacity-90 transition duration-200"
  >
    View
  </NuxtLink>
</td>
      </tr>
    </tbody>
  </table>
</div>

    </main>
  </div>
</section>


 
 

</template>