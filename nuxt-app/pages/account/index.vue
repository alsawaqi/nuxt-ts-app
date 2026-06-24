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
import AccountNotifications from '~/components/account/AccountNotifications.vue'

import AccountLoyalty from '~/components/account/AccountLoyalty.vue'


type OrdersFilter = { from?: string; to?: string; status?: string; q?: string }

interface LoyaltyTx {
  id: number
  Loyalty_Transaction_Code: string
  Customer_Id: number
  Orders_Placed_Id?: number | null
  Points_Earned: number
  Points_Redeemed: number
  Redeemed_Amount?: number | string | null
  created_at: string
  updated_at?: string
}




const { user, customer, isAuthenticated } = useAuth()
const { $axios, $r2Url } = useNuxtApp()
const { t } = useStorefrontLocale()
const route = useRoute()
const router = useRouter()

const loyaltyPage = ref(1)
const loyaltyPerPage = ref(10)
const loyaltyPagination = ref<any>(null)
const totalLoyaltyPoints = ref(0)
const totalLoyaltyEarned = ref(0)
const totalLoyaltyRedeemed = ref(0)
const totalLoyaltyRedeemedAmount = ref(0)


interface Order {
  id: number;
  Transaction_Number: number;
  Total_Price: string;
  Status: string;
  created_at: string;
}


interface OrderDetailsPayload {
  order?: {
    id: number
    order_code?: string | null
    transaction_number?: string | null
    status?: string | null
    created_at?: string | null
  }
  items?: Array<Record<string, unknown>>
  fulfillment?: Record<string, unknown>
  payment?: Record<string, unknown>
  transaction?: Record<string, unknown>
  totals?: Record<string, unknown>
}




const orders = ref<Order[]>([]);
const ordersLoading = ref<boolean>(true)
const loading = ref<boolean>(true);
const selectedOrderDetails = ref<OrderDetailsPayload | null>(null)
const showOrderDetails = ref(false)
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

const profileInitials = computed(() => {
  const source = customer.value?.Customer_Full_Name || user.value?.User_Name || user.value?.email || 'U'
  return String(source)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U'
})

const profileImageUrl = computed(() => {
  const path = customer.value?.Customer_Profile_Image_Path
  if (!path) return ''
  return `${String($r2Url || '').replace(/\/$/, '')}/${String(path).replace(/^\/+/, '')}`
})




type TabKey = 'orders' | 'profile' | 'addresses' | 'tickets' | 'favorites' | 'loyalty' | 'notifications'
const validTabs: TabKey[] = ['orders', 'profile', 'addresses', 'tickets', 'favorites', 'loyalty', 'notifications']
const queryTab = (value: unknown): TabKey => validTabs.includes(String(value) as TabKey) ? String(value) as TabKey : 'orders'
const activeTab = ref<TabKey>(queryTab(route.query.tab))
const notificationUnreadCount = ref(0)

const fetchNotificationCount = async () => {
  try {
    const { data } = await $axios.get('/api/notifications/unread-count', { withCredentials: true })
    notificationUnreadCount.value = Number(data?.unread_count ?? 0)
  } catch (error) {
    notificationUnreadCount.value = 0
  }
}

watch(() => route.query.tab, (tab) => {
  activeTab.value = queryTab(tab)
})

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return
  router.replace({ query: { ...route.query, tab } })
})




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
    totalLoyaltyEarned.value = data?.total_earned ?? 0
    totalLoyaltyRedeemed.value = data?.total_redeemed ?? 0
    totalLoyaltyRedeemedAmount.value = data?.total_redeemed_amount ?? 0
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





const closeOrderDetails = () => {
  selectedOrderDetails.value = null
  activeOrderId.value = null
  showOrderDetails.value = false
}

const fetchOrderDetails = async (orderId: number) => {
  activeOrderId.value = orderId
  loadingDetails.value = true
  selectedOrderDetails.value = null
  showOrderDetails.value = true

  try {
    const { data } = await $axios.get(`/api/orders/${orderId}/details`, { withCredentials: true })
    selectedOrderDetails.value = data
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
  closeOrderDetails()
  ordersFilter.value = filters
  ordersPage.value = 1
  await getOrders()
}

const onOrdersPageChange = async (page: number) => {
  closeOrderDetails()
  ordersPage.value = page
  await getOrders()
}


const onOrdersPerPageChange = async (pp: number) => {
  closeOrderDetails()
  ordersPerPage.value = pp
  ordersPage.value = 1
  await getOrders()
}


onMounted(async (): Promise<void> => {
  await getOrders();
  await getloyalitypoints();
  await fetchNotificationCount();
})







</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">

    <!-- Brand strip -->
    <div class="bg-white/90 border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <img src="https://isc-depot.com/images/logonew1.jpg" alt="ISC" class="h-9" />
        <span class="text-xs text-slate-500">{{ t('nav.account') }}</span>
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
      <div class="relative max-w-7xl mx-auto px-4 pt-8 pb-24">
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">{{ t('nav.welcome', { name: user?.User_Name || '' }) }}</h1>
        <p class="text-sm text-slate-600">{{ t('account.manage') }}</p>

        <!-- Glass profile card -->
        <div class="mt-6 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-5 shadow-lg">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-50 text-base font-bold text-cyan-700 ring-2 ring-white shadow">
                <img
                  v-if="profileImageUrl"
                  :src="profileImageUrl"
                  alt="Profile"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ profileInitials }}</span>
              </div>
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
                <span></span><span class="text-sm font-medium">{{ t('nav.points', { count: points }) }}</span>
              </span>

            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <div class="relative z-20 max-w-7xl mx-auto px-4 -mt-16 pb-12 grid grid-cols-1 md:grid-cols-4 gap-6">

      <!-- Sidebar -->
      <aside class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:sticky md:top-6 h-max">
        <nav class="mt-6 space-y-1 text-sm font-medium" role="tablist" aria-orientation="vertical">
          <button role="tab" :aria-selected="activeTab === 'orders'" @click="activeTab = 'orders'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'orders'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🛒</span>
            {{ t('account.orders') }}
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'orders' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>

          <button role="tab" :aria-selected="activeTab === 'notifications'" @click="activeTab = 'notifications'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'notifications'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">!</span>
            {{ t('account.notifications') }}
            <span v-if="notificationUnreadCount > 0" class="ml-auto text-xs rounded px-2 py-0.5 bg-cyan-600 text-white">
              {{ notificationUnreadCount }}
            </span>
          </button>

          <button role="tab" :aria-selected="activeTab === 'profile'" @click="activeTab = 'profile'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'profile'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">👤</span>
            {{ t('account.profile') }}
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'profile' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>

          <button role="tab" :aria-selected="activeTab === 'loyalty'" @click="activeTab = 'loyalty'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'loyalty'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🎖</span>
            {{ t('account.loyalty') }}
          </button>

          <button role="tab" :aria-selected="activeTab === 'favorites'" @click="activeTab = 'favorites'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'favorites'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">♡</span>
            {{ t('account.favorites') }}
          </button>

          <button role="tab" :aria-selected="activeTab === 'addresses'" @click="activeTab = 'addresses'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'addresses'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🏠</span>
            {{ t('account.addresses') }}
            <span class="ml-auto text-xs rounded px-2 py-0.5"
              :class="activeTab === 'addresses' ? 'bg-white text-cyan-700' : 'bg-slate-100 text-slate-600'">

            </span>
          </button>


          <button role="tab" :aria-selected="activeTab === 'tickets'" @click="activeTab = 'tickets'"
            class="w-full flex items-center px-3 py-2 rounded-md transition" :class="activeTab === 'tickets'
              ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200'
              : 'text-slate-700 hover:bg-slate-50'">
            <span class="mr-2">🎫</span>
            {{ t('account.requests') }}
          </button>

        </nav>

        <div class="mt-6 border-t border-slate-200 pt-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('footer.orderSupport') }}</p>
          <div class="mt-2 grid gap-1 text-xs">
            <NuxtLink to="/policies/shipping" class="text-slate-600 hover:text-cyan-700">{{ t('nav.shipping') }}</NuxtLink>
            <NuxtLink to="/policies/returns" class="text-slate-600 hover:text-cyan-700">{{ t('footer.returns') }}</NuxtLink>
            <NuxtLink to="/policies/warranty" class="text-slate-600 hover:text-cyan-700">{{ t('footer.warranty') }}</NuxtLink>
            <NuxtLink to="/policies/privacy" class="text-slate-600 hover:text-cyan-700">{{ t('footer.privacy') }}</NuxtLink>
          </div>
        </div>
      </aside>


      <!-- Orders -->
      <main class="md:col-span-3 space-y-4">


      <AccountOrders
  v-if="activeTab === 'orders'"
  :orders="orders"
  :loading="ordersLoading"
  :details-loading="loadingDetails"
  :show-details="showOrderDetails"
  :selected-details="selectedOrderDetails"
  :active-order-id="activeOrderId"
  :pagination="ordersPagination"
  @show-details="fetchOrderDetails"
  @close-details="closeOrderDetails"
  @filter-change="onOrdersFilterChange"
  @page-change="onOrdersPageChange"
  @per-page-change="onOrdersPerPageChange"
/>

        <AccountNotifications
          v-show="activeTab === 'notifications'"
          @changed="fetchNotificationCount"
        />


        <AccountProfile v-show="activeTab === 'profile'" :loading="loading" />


        <AccountAddresses v-show="activeTab === 'addresses'" :loading="loading" />


        <AccountLoyalty
  v-show="activeTab === 'loyalty'"
  :loading="loyaltyLoading"
  :transactions="loyaltyTx"
  :pagination="loyaltyPagination"
  :total-points="totalLoyaltyPoints"
  :total-earned="totalLoyaltyEarned"
  :total-redeemed="totalLoyaltyRedeemed"
  :total-redeemed-amount="totalLoyaltyRedeemedAmount"
  @page-change="onLoyaltyPageChange"
  @per-page-change="onLoyaltyPerPageChange"
/>
        <AccountFavorites v-show="activeTab === 'favorites'" />


        <AccountTickets v-show="activeTab === 'tickets'" :tickets="tickets" :loading="ticketsLoading"
          :creating="creatingTicket" :active-ticket="activeTicket" :messages="ticketMessages"
          :messages-loading="ticketMsgsLoading" @close-ticket="closeTicket" @reply="replyTicket"
          @refresh="refreshTickets" />



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
