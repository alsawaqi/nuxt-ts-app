<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  middleware: 'auth',
})

import AccountOrders from '~/components/account/AccountOrders.vue'
import AccountProfile from '~/components/account/AccountProfile.vue'
import AccountAddresses from '~/components/account/AccountAddresses.vue'
import AccountTickets from '~/components/account/AccountTickets.vue'
import AccountFavorites from '~/components/account/AccountFavorites.vue'

import AccountLoyalty from '~/components/account/AccountLoyalty.vue'


type OrdersFilter = { from?: string; to?: string; status?: string; q?: string }

interface LoyaltyTx {
  id: number
  Loyalty_Transaction_Code: string
  Customer_Id: number
  Orders_Placed_Id?: number | null
  Points_Earned: number
  Points_Redeemed: number
  created_at: string
  updated_at?: string
}




const { user, isAuthenticated } = useAuth()
const { $axios } = useNuxtApp()

const loyaltyPage = ref(1)
const loyaltyPerPage = ref(10)
const loyaltyPagination = ref<any>(null)
const totalLoyaltyPoints = ref(0)


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
const ordersLoading = ref<boolean>(true)
const loading = ref<boolean>(true);
const selectedOrderDetails = ref<OrderDetail[]>([])
const showDetailsModal = ref(false)
const loadingDetails = ref(false)
const points = ref<any>('')

  const ordersFilter = ref<OrdersFilter>({})
const ordersPage = ref(1)
const ordersPerPage = ref(10)

const ordersPagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0 as number | null,
  to: 0 as number | null,
})


const activeOrderId = ref<number | null>(null)




type TabKey = 'orders' | 'profile' | 'addresses' | 'tickets' | 'favorites' | 'loyalty'
const activeTab = ref<TabKey>('orders')




// Loyalty state
const loyaltyLoading = ref(false)
const loyaltyLoaded = ref(false)
const loyaltyTx = ref<LoyaltyTx[]>([])

const fetchLoyalty = async () => {
  loyaltyLoading.value = true
  try {
    const { data } = await $axios.get('/api/loyalty/points', {
      withCredentials: true,
      params: { page: loyaltyPage.value, per_page: loyaltyPerPage.value },
    })

    loyaltyTx.value = data?.data ?? []
    loyaltyPagination.value = data?.pagination ?? null
    totalLoyaltyPoints.value = data?.total_points ?? 0
    loyaltyLoaded.value = true
  } finally {
    loyaltyLoading.value = false
  }
}

const onLoyaltyPageChange = async (p: number) => { loyaltyPage.value = p; await fetchLoyalty() }
const onLoyaltyPerPageChange = async (pp: number) => { loyaltyPerPage.value = pp; loyaltyPage.value = 1; await fetchLoyalty() }
// Lazy-load when tab is opened
watch(activeTab, (t) => { if (t === 'loyalty') fetchLoyalty() })


// Tickets state you can wire to your API later
const tickets = ref([])                 // Ticket[]
const ticketsLoading = ref(false)
const creatingTicket = ref(false)
const activeTicket = ref(null)          // Ticket | null
const ticketMessages = ref(null)        // TicketMessage[] | null
const ticketMsgsLoading = ref(false)

// Handlers

const closeTicket = async (id: number) => { /* PATCH status=closed, refresh list */ }
const replyTicket = async ({ id, body }: { id: number; body: string }) => { /* POST message, push into ticketMessages */ }
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


const getloyalitypoints = async () => {

  try {
    const response = await $axios.get('/api/loyalty', { withCredentials: true })

    points.value = response.data
  } catch (e) {

  } finally {

  }
}

const getOrders = async () => {
  ordersLoading.value = true
  try {
    const { data } = await $axios.get('/api/orders', {
      withCredentials: true,
      params: {
        ...ordersFilter.value,
        page: ordersPage.value,
        per_page: ordersPerPage.value,
      },
    })

    orders.value = data?.data ?? []
    if (data?.pagination) ordersPagination.value = data.pagination
  } finally {
    ordersLoading.value = false
  }
}


const onOrdersFilterChange = async (filters: OrdersFilter) => {
  ordersFilter.value = filters
  ordersPage.value = 1
  await getOrders()
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

const onOrdersPageChange = async (page: number) => {
  ordersPage.value = page
  await getOrders()
}


const onOrdersPerPageChange = async (pp: number) => {
  ordersPerPage.value = pp
  ordersPage.value = 1
  await getOrders()
}


onMounted(async (): Promise<void> => {
  await getOrders();
  await getloyalitypoints();
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
      <div class="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
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
              <img src="https://i.pravatar.cc/100" alt="Profile"
                class="w-16 h-16 rounded-full ring-2 ring-white shadow" />
              <div>
                <p class="text-lg font-semibold text-slate-900">{{ user?.User_Name }}</p>
                <p class="text-xs text-slate-500">Member since <span class="font-medium">{{ new
                  Date(user?.created_at).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year:'numeric' })
                    }}</span></p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 px-3 py-1 ring-1 ring-amber-200">
                <span>🎖</span><span class="text-sm font-medium">{{ points }} points </span>
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
          <button role="tab" :aria-selected="activeTab === 'orders'" @click="activeTab = 'orders'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'orders'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🛒</span>
            Order Placed
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'orders' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>

          <button role="tab" :aria-selected="activeTab === 'profile'" @click="activeTab = 'profile'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'profile'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">👤</span>
            Profile
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'profile' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>

          <button role="tab" :aria-selected="activeTab === 'loyalty'" @click="activeTab = 'loyalty'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'loyalty'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🎖</span>
            Loyalty
          </button>

          <button role="tab" :aria-selected="activeTab === 'favorites'" @click="activeTab = 'favorites'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'favorites'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">♡</span>
            Favorites
          </button>

          <button role="tab" :aria-selected="activeTab === 'addresses'" @click="activeTab = 'addresses'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'addresses'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🏠</span>
            Addresses
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'addresses' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>


          <button role="tab" :aria-selected="activeTab === 'tickets'" @click="activeTab = 'tickets'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'tickets'
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
  :loading="ordersLoading"
  :pagination="ordersPagination"
  @show-details="fetchOrderDetails"
  @filter-change="onOrdersFilterChange"
  @page-change="onOrdersPageChange"
  @per-page-change="onOrdersPerPageChange"
/>


        <AccountProfile v-show="activeTab === 'profile'" :loading="loading" />


        <AccountAddresses v-show="activeTab === 'addresses'" :loading="loading" />


        <AccountLoyalty
  v-show="activeTab === 'loyalty'"
  :loading="loyaltyLoading"
  :transactions="loyaltyTx"
  :pagination="loyaltyPagination"
  :total-points="totalLoyaltyPoints"
  @page-change="onLoyaltyPageChange"
  @per-page-change="onLoyaltyPerPageChange"
/>
        <AccountFavorites v-show="activeTab === 'favorites'" />


        <AccountTickets v-show="activeTab === 'tickets'" :tickets="tickets" :loading="ticketsLoading"
          :creating="creatingTicket" :active-ticket="activeTicket" :messages="ticketMessages"
          :messages-loading="ticketMsgsLoading" @close-ticket="closeTicket" @reply="replyTicket"
          @refresh="refreshTickets" />



        <transition name="fade">
          <div v-if="showDetailsModal" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
            @click.self="showDetailsModal = false">
            <div class="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold">
                  Order #{{ activeOrderId ?? '' }} &middot; Details
                </h2>
                <button class="px-3 py-1.5 rounded ring-1 ring-slate-200 hover:bg-slate-50"
                  @click="showDetailsModal = false">
                  Close
                </button>
              </div>

              <div v-if="loadingDetails" class="text-center py-10">Loading...</div>

              <template v-else>
                <table v-if="selectedOrderDetails.length"
                  class="min-w-full text-sm text-left border rounded overflow-hidden">
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