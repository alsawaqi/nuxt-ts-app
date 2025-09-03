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

type GridHeader = { id: number; name: string }
type GridRow = {
  id: number
  name: string
  price: number
  slug: string
  specs: Record<number, { value_id: number | null; label: string | null } | null>
  image: ProductImage | null
}


const headers = ref<GridHeader[]>([])
const rows    = ref<GridRow[]>([])

const openCats = ref<Record<number, boolean>>({})          // default open
const isOpen = (id: number) => openCats.value[id] !== false
const toggleCat = (id: number) => (openCats.value[id] = !isOpen(id))

const clearCategory = (id: number) => {                    // clear one group
  selectedFilters.value[id] = []
}
const clearAllFilters = () => {                            // clear all groups
  for (const k of Object.keys(selectedFilters.value)) {
    selectedFilters.value[+k] = []
  }
}


const router = useRouter()
const goProduct = (slug: string) => router.push(`/product/${slug}`)



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
  View_Options: boolean
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
const view_option = ref<boolean>(false)
// selected filters by description id -> array of value ids
const selectedFilters = ref<Record<number, number[]>>({})



const getDepartment = async () => {
  isloadingsubsubdepartments.value = true
  try {

      const res = await $axios.get(`/api/subsubdepartments/${slug.value}`)


      view_option.value = res.data.data.view_options;

      const apiFilters = res.data.filters as any[]

     console.log('API Filters:', apiFilters);

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
    const spec_ids = Object.values(selectedFilters.value).flat()

    const { data } = await $axios.get(`/api/products/${slug.value}`, {
      params: {
        filters: JSON.stringify(selectedFilters.value), // safe for GET
        spec_ids,
      },
    })

    headers.value = data.headers ?? []
    rows.value    = data.products ?? []
  } catch (e) {
    console.error('Error fetching products grid:', e)
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
   <!-- Sidebar Filters -->
<aside class="hidden md:block w-full md:w-1/4">
  <div class="sticky top-6">
    <div class="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg">
      <!-- Header -->
      <div class="px-5 py-4 flex items-center justify-between border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <i class="fas fa-filter text-teal-600"></i>
          Filters
        </h2>
        <button
          type="button"
          @click="clearAllFilters"
          class="text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline"
        >
          Clear all
        </button>
      </div>

      <!-- Body (scrolls if tall) -->
      <div class="max-h-[70vh] overflow-auto px-2 py-3">
        <ul class="space-y-3">
          <!-- Category -->
          <li
            v-for="category in filters"
            :key="category.id"
            class="rounded-lg border border-gray-200 bg-gray-50"
          >
            <!-- Category header / accordion toggle -->
            <button
              type="button"
              @click="toggleCat(category.id)"
              class="w-full flex items-center justify-between px-4 py-3"
            >
              <div class="flex items-center gap-2 text-gray-800">
                <span class="text-sm font-semibold">{{ category.name }}</span>
                <span
                  v-if="(selectedFilters[category.id] ?? []).length"
                  class="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700"
                >
                  {{ selectedFilters[category.id].length }}
                </span>
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click.stop="clearCategory(category.id)"
                  class="text-[11px] text-gray-500 hover:text-teal-700"
                >
                  Reset
                </button>
                <svg
                  class="h-4 w-4 text-gray-500 transition-transform"
                  :class="isOpen(category.id) ? 'rotate-180' : ''"
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                        clip-rule="evenodd" />
                </svg>
              </div>
            </button>

            <!-- Options -->
            <transition name="fade">
              <div v-show="isOpen(category.id)" class="px-4 pb-3">
                <div class="max-h-48 overflow-auto pr-1 space-y-1.5">
                  <label
                    v-for="opt in category.values"
                    :key="opt.id"
                    :title="opt.value"
                    class="flex items-center gap-2 text-[13px] text-gray-700 hover:text-teal-700"
                  >
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded-sm border-gray-300 accent-teal-600 focus:ring-2 focus:ring-teal-400"
                      :value="opt.id"
                      v-model="selectedFilters[category.id]"
                    />
                    <span class="truncate">{{ opt.value }}</span>
                  </label>
                </div>
              </div>
            </transition>
          </li>
        </ul>
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

          {{ view_option }} 
         </p>
      </div>

      <!-- Product Types -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="border rounded p-4 flex flex-col items-center text-center">
          <img :src="`${$r2Url}/` + subsubdepartment?.Image_Path" alt="Insulated" class="h-16 mb-2">
         
        </div>
        
      </div>

     
      <!-- Table -->
     <div class="overflow-hidden rounded-xl border border-gray-200 shadow-sm">

       <div v-if="view_option" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    <article
      v-for="row in rows"
      :key="row.id"
      @click="goProduct(row.slug)"
      @keydown.enter="goProduct(row.slug)"
      role="button"
      tabindex="0"
      class="group relative rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 hover:shadow-lg hover:-translate-y-[2px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
    >
      <!-- top image -->
      <div class="aspect-[4/3] overflow-hidden bg-slate-50">
        <img
          :src="row.image?.Image_Path"
          :alt="row.name"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />

       
      </div>

      <!-- content -->
      <div class="p-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-[15px] font-semibold text-slate-900 line-clamp-2">
            {{ row.name }}

             {{ row.image?.Image_Path }}
          </h3>
          <div class="text-right shrink-0">
            <div class="text-[13px] font-semibold px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm">
             
            </div>
          </div>
        </div>

        <!-- spec chips -->
        <div class="mt-3 flex flex-wrap gap-2">
           
        </div>
      </div>

      <!-- bottom bar -->
      <div class="px-4 pb-4">
        <div class="flex items-center justify-between text-[12px] text-slate-500">
          <span class="inline-flex items-center gap-1">
            <span class="i-heroicons-arrow-top-right-on-square-20-solid"></span>
            View details
          </span>
          <svg class="h-4 w-4 text-slate-400 group-hover:text-cyan-500 transition-colors" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1
              1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <!-- subtle gradient border on top -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-500/80 via-sky-500/80 to-blue-600/80"></div>
    </article>
  </div>

        <table v-else class="min-w-full table-fixed text-sm bg-white">
          <thead class="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th class="px-5 py-3 text-left">Name</th>
              <!-- dynamic spec headers -->
              <th v-for="h in headers" :key="h.id" class="px-5 py-3 text-left">
                {{ h.name }}
              </th>
              <th class="px-5 py-3 text-right">Price</th>
              
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100 text-[12px]">
            <tr
              v-for="row in rows"
              :key="row.id"
              @click="goProduct(row.slug)"
              @keydown.enter="goProduct(row.slug)"
              role="button"
              tabindex="0"
              class="group cursor-pointer odd:bg-white even:bg-slate-50 hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              <!-- Name -->
              <td class="px-5 py-2.5 leading-5 whitespace-nowrap truncate max-w-[260px] font-medium text-gray-900">
                {{ row.name }}
              </td>

              <!-- dynamic spec cells -->
              <td
                v-for="h in headers"
                :key="`${row.id}:${h.id}`"
                class="px-5 py-2.5 leading-5 whitespace-nowrap truncate text-gray-700"
              >
                {{ row.specs[h.id]?.label ?? '—' }}
              </td>

              <!-- Price (right aligned) -->
              <td class="px-5 py-2.5 leading-5 whitespace-nowrap text-right font-semibold text-gray-900">
                {{ row.price }} OMR
              </td>

              
            </tr>
          </tbody>
        </table>
    </div>


    </main>
  </div>
</section>


 
 

</template>