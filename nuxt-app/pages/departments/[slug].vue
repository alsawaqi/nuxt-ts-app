 <script setup lang="ts">
definePageMeta({ layout: 'layouts' })

import { ref, watch, onMounted, computed } from 'vue'
const { $axios, $r2Url } = useNuxtApp()

const showFilters = ref(false)
const route = useRoute()
const slug = computed(() => route.params.slug as string)

const isloadingsubsubdepartments = ref(true)
const isloadingproducts = ref(true)

interface FilterValue {
  id: number
  value: string
}

type InputType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean'

interface FilterCategory {
  id: number
  name: string
  type: InputType
  values: FilterValue[]
}

interface SubSubDepartment {
  id: string
  Product_Sub_Sub_Department_Name: string
  Slug: string
  Product_Sub_Sub_Department_Description: string
  Image_Path: string
}

interface SubSubDepartmentResponse {
  data: SubSubDepartment
  filters: any[] // we'll map to FilterCategory[]
}

interface ProductImage {
  Image_Path: string
}

interface Products {
  id: string
  Product_Name: string
  Product_Price: number
  Slug: string
  image: ProductImage | null
}

const subsubdepartment = ref<SubSubDepartment | null>(null)
const filters = ref<FilterCategory[]>([])
const products = ref<Products[]>([])

// selected filters by description id -> array of value ids
const selectedFilters = ref<Record<number, number[]>>({})

const getDepartment = async () => {
  isloadingsubsubdepartments.value = true
  try {

    const res = await $axios.get(`/api/subsubdepartments/${slug.value}`)

const apiFilters = res.data.filters as any[]

// Normalize to a clean shape with number IDs
filters.value = apiFilters.map((f) => ({
  id: Number(f.id),
  name: String(f.Product_Specification_Description_Name ?? ''),
  type: (f.input_type ?? 'select') as 'text'|'number'|'select'|'multiselect'|'boolean',
  values: (f.values ?? []).map((v: any) => ({
    id: Number(v.id),
    value: String(v.value),
  })),
}))

// init selected filters AFTER filters are set
selectedFilters.value = filters.value.reduce((acc, f) => {
  acc[f.id] = [] as number[]
  return acc
}, {} as Record<number, number[]>)

// optional: debug to ensure numbers
console.table(filters.value.map(f => ({
  id: f.id,
  name: f.name,
  valueIds: f.values.map(v => v.id).join(',')
})))
   
  } catch (error) {
    console.error('Error fetching department:', error)
  } finally {
    isloadingsubsubdepartments.value = false
  }
}

const getProducts = async () => {
  isloadingproducts.value = true
  try {
    const spec_ids = Object.values(selectedFilters.value).flat() // already numbers

    const { data } = await $axios.get<Products[]>(`/api/products/${slug.value}`, {
      params: {
        filters: JSON.stringify(selectedFilters.value), // safe for GET
        spec_ids,                       // optional convenience param
      },
    })
    products.value = data
  } catch (error) {
    console.error('Error fetching products:', error)
  } finally {
    isloadingproducts.value = false
  }
}

// Refetch products whenever filters change
watch(selectedFilters, async () => {
  await getProducts()
}, { deep: true })

// Lock scroll when mobile drawer open
watch(showFilters, (val) => {
  if (import.meta.client) document.body.style.overflow = val ? 'hidden' : ''
})

onMounted(async () => {
  await getDepartment()
  await getProducts()
})
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
         <div v-for="category in filters" :key="category.id" class="space-y-2">
  <h3 class="font-semibold">{{ category.name }}</h3>
  <label
    v-for="opt in category.values"
    :key="opt.id"
    class="flex items-center gap-2"
  >
    <input
      type="checkbox"
      class="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
      :value="opt.id"                          
      v-model="selectedFilters[category.id]"   
    />
    <span>{{ opt.value }}</span>
  </label>
</div>
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
   v-for="opt in category.values"
    :key="opt.id"
      class="flex items-center text-gray-700 hover:text-blue-600 transition"
    >
     <input
      type="checkbox"
      class="mr-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
      :value="opt.id"                          
      v-model="selectedFilters[category.id]"   
    />
    <span>{{ opt.value }}</span>
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
          {{subsubdepartment?.Product_Sub_Sub_Department_Name }}
        </h1>
        <p class="text-sm text-gray-700">
          {{ subsubdepartment?.Product_Sub_Sub_Department_Description }}
         </p>
      </div>

      <!-- Product Types -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="border rounded p-4 flex flex-col items-center text-center">
          <img :src="`${$r2Url}/` + subsubdepartment?.Image_Path" alt="Insulated" class="h-16 mb-2">
         
        </div>
        
      </div>

     
      <!-- Table -->
    <div class="overflow-x-auto border border-gray-300 rounded-lg shadow-xl">
  <table class="min-w-full text-sm text-left bg-white rounded-lg">
    <thead class="bg-gradient-to-r from-cyan-400 to-blue-600 text-white text-xs font-semibold uppercase tracking-wider">
      <tr>
        <th class="px-5 py-3 border-b">#</th>
       
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

    

        <td class="px-5 py-4 text-gray-700">{{ product.Product_Name }}</td>
        <td class="px-5 py-4 text-gray-700 font-semibold">{{ product.Product_Price }} OMR</td>

       <td class="px-5 py-4">
  <NuxtLink
    :to="`/product/${product.Slug}`"
    class="inline-block bg-gradient-to-r from-cyan-400  via-black-400  to-blue-600 text-white text-xs font-semibold px-5 py-2 rounded-md shadow-md hover:opacity-90 transition duration-200"
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