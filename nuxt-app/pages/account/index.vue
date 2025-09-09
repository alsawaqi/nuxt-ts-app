<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})

import AccountOrders from '~/components/account/AccountOrders.vue'
import AccountProfile from '~/components/account/AccountProfile.vue'
import AccountAddresses from '~/components/account/AccountAddresses.vue'
import AccountTickets from '~/components/account/AccountTickets.vue'

const addresses = ref([])           // fetch these from your API
 
const selectedAddressId = ref<number|null>(null)

const addAddress    = () => { /* open your create modal */ }
const editAddress   = (id:number) => { /* open your edit modal */ }
const deleteAddress = (id:number) => { /* call API then refresh */ }
const setDefault    = (id:number) => { /* call API then refresh */ }

const { user, isAuthenticated } = useAuth()
const { $axios } = useNuxtApp()
interface Order { 
                    id: number; 
                    Transaction_Number: number; 
                    Total_Price: string; 
                    Status: string; 
                    created_at: string; 
                  } 


                  interface OrderDetail {
  id: number
  Quantity: number
  Price: number
  product?: { Product_Name?: string }
}


const orders = ref<Order[]>([]); 
const loading = ref<boolean>(true); 
const selectedOrderDetails = ref<OrderDetail[]>([]) 
const showDetailsModal = ref(false) 
const loadingDetails = ref(false)


 
const activeOrderId = ref<number | null>(null)


 
 
type TabKey = 'orders' | 'profile' | 'addresses' | 'tickets'
const activeTab = ref<TabKey>('orders')


// Tickets state you can wire to your API later
const tickets = ref([])                 // Ticket[]
const ticketsLoading = ref(false)
const creatingTicket = ref(false)
const activeTicket = ref(null)          // Ticket | null
const ticketMessages = ref(null)        // TicketMessage[] | null
const ticketMsgsLoading = ref(false)

// Handlers
 
const closeTicket  = async (id:number) => { /* PATCH status=closed, refresh list */ }
const replyTicket  = async ({id, body}:{id:number; body:string}) => { /* POST message, push into ticketMessages */ }
const refreshTickets = async () => { /* GET list */ }

 



const fetchOrderDetails = async (orderId: number) => { 
  
  loadingDetails.value = true 
  selectedOrderDetails.value = [] 
  try { 
    const res = await $axios.get(`/api/orders/${orderId}/details`)
     selectedOrderDetails.value = res.data 
     showDetailsModal.value = true 
    } catch (e) {
       console.error('Failed to fetch order details', e) 
      } finally { 
        loadingDetails.value = false 
      } 
    } 
  
    const getOrders = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get('/api/orders', { withCredentials: true })
    orders.value = data
  } finally {
    loading.value = false
  }
}


const onShowOrderDetails = async (orderId: number) => {
  activeOrderId.value = orderId
  loadingDetails.value = true
  selectedOrderDetails.value = []
  showDetailsModal.value = true

  try {
    const { data } = await $axios.get(`/api/orders/${orderId}/details`, { withCredentials: true })
    selectedOrderDetails.value = data   // expects array of details
  } catch (e) {
    console.error('Failed to fetch order details', e)
  } finally {
    loadingDetails.value = false
  }
}


  onMounted(async (): Promise<void> => { 
    await getOrders(); 
  })


 
 

 

</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">

    <!-- Brand strip -->
    <div class="bg-white/90 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <img src="https://isc-depot.com/images/logonew1.jpg" alt="ISC" class="h-9" />
        <span class="text-xs text-slate-500">My Account</span>
      </div>
    </div>

    <!-- Hero -->
   <section class="relative">
  <!-- decorative blobs -->
  <div
    class="absolute inset-0 overflow-hidden pointer-events-none -z-10"
    aria-hidden="true"
  >
    <div class="absolute -top-16 -left-20 h-64 w-64 bg-teal-400/30 blur-3xl rounded-full"></div>
    <div class="absolute -bottom-20 -right-24 h-72 w-72 bg-cyan-400/30 blur-3xl rounded-full"></div>
  </div>

  <!-- your actual content -->
  <div class="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-24">
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">Welcome back</h1>
        <p class="text-sm text-slate-600">Manage your orders, profile and addresses</p>

        <!-- Glass profile card -->
        <div class="mt-6 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-5 shadow-lg">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-center gap-4">
              <img
                src="https://i.pravatar.cc/100"
                alt="Profile"
                class="w-16 h-16 rounded-full ring-2 ring-white shadow"
              />
              <div>
                <p class="text-lg font-semibold text-slate-900">{{ user?.User_Name }}</p>
                <p class="text-xs text-slate-500">Member since <span class="font-medium">February 06, 2017</span></p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 px-3 py-1 ring-1 ring-amber-200">
                <span>🎖</span><span class="text-sm font-medium">0 points</span>
              </span>
               
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 -mt-16 pb-12 grid grid-cols-1 md:grid-cols-4 gap-6">

      <!-- Sidebar -->
      <aside class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:sticky md:top-6 h-max">
  <!-- avatar block unchanged -->

  <nav class="mt-6 space-y-1 text-sm font-medium" role="tablist" aria-orientation="vertical">
    <button
      role="tab"
      :aria-selected="activeTab==='orders'"
      @click="activeTab='orders'"
      class="w-full flex items-center px-3 py-2 rounded-md transition"
      :class="activeTab==='orders'
        ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
        : 'text-slate-700 hover:bg-slate-50'"
    >
      <span class="mr-2">🛒</span>
      Orders
      <span class="ml-auto text-xs rounded px-2 py-0.5"
            :class="activeTab==='orders' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">
       
      </span>
    </button>

    <button
      role="tab"
      :aria-selected="activeTab==='profile'"
      @click="activeTab='profile'"
      class="w-full flex items-center px-3 py-2 rounded-md transition"
      :class="activeTab==='profile'
        ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
        : 'text-slate-700 hover:bg-slate-50'"
    >
      <span class="mr-2">👤</span>
      Profile
      <span class="ml-auto text-xs rounded px-2 py-0.5"
            :class="activeTab==='profile' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

      </span>
    </button>

    <button
      role="tab"
      :aria-selected="activeTab==='addresses'"
      @click="activeTab='addresses'"
      class="w-full flex items-center px-3 py-2 rounded-md transition"
      :class="activeTab==='addresses'
        ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
        : 'text-slate-700 hover:bg-slate-50'"
    >
      <span class="mr-2">🏠</span>
      Addresses
      <span class="ml-auto text-xs rounded px-2 py-0.5"
            :class="activeTab==='addresses' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

      </span>
    </button>


    <button
  role="tab"
  :aria-selected="activeTab==='tickets'"
  @click="activeTab='tickets'"
  class="w-full flex items-center px-3 py-2 rounded-md transition"
  :class="activeTab==='tickets'
    ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
    : 'text-slate-700 hover:bg-slate-50'">
  <span class="mr-2">🎫</span>
  Requests
</button>

  </nav>
</aside>


      <!-- Orders -->
      <main class="md:col-span-3 space-y-4">


        <AccountOrders
          v-if="activeTab === 'orders'"
          :orders="orders"
          :loading="loading"
          @show-details="fetchOrderDetails"
        />


      <AccountProfile
          v-show="activeTab==='profile'"
          :loading="loading"
        />


         <AccountAddresses
           v-show="activeTab==='addresses'"
           
           :loading="loading"
           
         />



         <AccountTickets
              v-show="activeTab==='tickets'"
              :tickets="tickets"
              :loading="ticketsLoading"
              :creating="creatingTicket"
              :active-ticket="activeTicket"
              :messages="ticketMessages"
              :messages-loading="ticketMsgsLoading"
            
              @close-ticket="closeTicket"
              @reply="replyTicket"
              @refresh="refreshTickets"
            />
  


            <transition name="fade">
      <div
        v-if="showDetailsModal"
        class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        @click.self="showDetailsModal=false"
      >
        <div class="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">
              Order #{{ activeOrderId ?? '' }} &middot; Details
            </h2>
            <button class="px-3 py-1.5 rounded ring-1 ring-slate-200 hover:bg-slate-50"
                    @click="showDetailsModal=false">
              Close
            </button>
          </div>

          <div v-if="loadingDetails" class="text-center py-10">Loading...</div>

          <template v-else>
            <table v-if="selectedOrderDetails.length" class="min-w-full text-sm text-left border rounded overflow-hidden">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-2">Product</th>
                  <th class="px-4 py-2">Quantity</th>
                  <th class="px-4 py-2">Price</th>
                  <th class="px-4 py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="d in selectedOrderDetails" :key="d.id">
                  <td class="px-4 py-2">{{ d.product?.Product_Name ?? 'N/A' }}</td>
                  <td class="px-4 py-2">{{ d.Quantity }}</td>
                  <td class="px-4 py-2">OMR {{ d.Price }}</td>
                  <td class="px-4 py-2">OMR {{ (d.Price * d.Quantity).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>

            <div v-else class="text-slate-500 text-sm">No details found for this order.</div>
          </template>
        </div>
      </div>
    </transition>



      </main>
    </div>

    
  </div>
</template>

<style scoped>
.bg-primary {
  background-color: #00bfa5;
}
.text-primary {
  color: #00bfa5;
}
</style>