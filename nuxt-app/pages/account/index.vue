<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})


const { user, isAuthenticated } = useAuth()
const { $axios } = useNuxtApp()

 


 
interface Order {
   id: number;
  Transaction_Number: number;
  Total_Price: string;
  Status: string;
  created_at: string;
 
}

const orders = ref<Order[]>([]);
const loading = ref<boolean>(true);


 
const selectedOrderDetails = ref<any[]>([])
const showDetailsModal = ref(false)
const loadingDetails = ref(false)

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

const getorders = async (): Promise<void> => {
   loading.value = true;
  try {
    const response = await $axios.get('/api/orders', {withCredentials: true});

      orders.value = response.data;
    }catch (error) {
      console.error('Error fetching orders:', error) 
    }finally{
      loading.value = false;
    }
  }
 

 


onMounted(async (): Promise<void> => {
  await getorders();

})

</script>
<template>

   <div class="  bg-gray-100">
    <!-- Company Header if applicable -->
    <div class="p-6 bg-white shadow">
      <img src="#" alt="Company Logo" class="h-10" />
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Sidebar -->
      <aside class="bg-white rounded-lg shadow p-4">
        <div class="flex flex-col items-center text-center">
          <img
            src="https://i.pravatar.cc/100"
            alt="Profile"
            class="w-24 h-24 rounded-full mb-3"
          />
          <p class="font-semibold text-lg">{{ user?.User_Name }}</p>
          <p class="text-sm text-gray-500">Joined February 06, 2017</p>
          <div class="mt-2 text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
            🎖 0 points
          </div>
        </div>

        <!-- Nav Menu -->
        <nav class="mt-6 space-y-2 text-sm font-medium">
          <a href="#" class="flex items-center px-3 py-2 rounded bg-primary text-white">
            <i class="mr-2">🛒</i> Orders <span class="ml-auto bg-white text-primary px-2 rounded text-xs">{{ orders?.length }}</span>
          </a>
          <a href="#" class="flex items-center px-3 py-2 rounded hover:bg-gray-100">
            <i class="mr-2">👤</i> Profile
          </a>
          <a href="#" class="flex items-center px-3 py-2 rounded hover:bg-gray-100">
            <i class="mr-2">📍</i> Addresses
          </a>
          <a href="#" class="flex items-center px-3 py-2 rounded hover:bg-gray-100">
            <i class="mr-2">❤️</i> Wishlist <span class="ml-auto bg-gray-200 px-2 rounded text-xs">3</span>
          </a>
          <a href="#" class="flex items-center px-3 py-2 rounded hover:bg-gray-100">
            <i class="mr-2">🎫</i> My Tickets <span class="ml-auto bg-gray-200 px-2 rounded text-xs">4</span>
          </a>
        </nav>
      </aside>

      <!-- Orders Table -->
      <main class="md:col-span-3">
        <h2 class="text-2xl font-semibold mb-4">My Orders</h2>

        <div class="bg-white rounded-lg shadow overflow-x-auto">
          <table class="min-w-full text-sm text-left">
            <thead class="bg-gray-100">
              <tr class="text-gray-700">
                <th class="px-4 py-3">Order #</th>
                <th class="px-4 py-3">Date Purchased</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Total</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

             
            <tbody>
              <tr v-for="order in orders" :key="order.id" class="border-t">
                <td class="px-4 py-3 font-semibold">{{ order.Transaction_Number }}</td>
                <td class="px-4 py-3">{{ order.created_at }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'font-medium',
                      order.Status === 'Canceled' ? 'text-red-500' :
                      order.Status === 'In Progress' ? 'text-blue-500' :
                      order.Status === 'Delayed' ? 'text-orange-500' :
                      'text-green-500'
                    ]"
                  >
                    {{ order.Status }}
                  </span>
                </td>
                <td class="px-4 py-3 font-semibold">OMR {{ order.Total_Price }}</td>
               <td class="px-4 py-3 text-right">
                <button
                  class="text-blue-600 hover:underline text-sm"
                  @click="fetchOrderDetails(order.id)"
                >
                  Order Details
                </button>
              </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </div>

  <transition name="fade">
  <div v-if="showDetailsModal" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-lg p-6 w-full max-w-3xl shadow-lg">
      <h2 class="text-lg font-semibold mb-4">Order Details</h2>

      <div v-if="loadingDetails" class="text-center py-10">Loading...</div>

      <div v-else-if="selectedOrderDetails.length > 0">
        <table class="min-w-full text-sm text-left border">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2">Product</th>
              <th class="px-4 py-2">Quantity</th>
              <th class="px-4 py-2">Price</th>
              <th class="px-4 py-2">Subtotal</th>
              <th class="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="detail in selectedOrderDetails" :key="detail.id" class="border-t">
              <td class="px-4 py-2">{{ detail.product?.Product_Name || 'N/A' }}</td>
              <td class="px-4 py-2">{{ detail.Quantity }}</td>
              <td class="px-4 py-2">OMR {{ detail.Price }}</td>
              <td class="px-4 py-2">OMR {{ (detail.Price * detail.Quantity).toFixed(2) }}</td>
              <td class="px-4 py-2">
                <button
                  class="text-red-600 hover:underline text-sm"
                  
                >
                  Defective
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-gray-500 text-sm">No details found for this order.</div>

      <div class="text-right mt-4">
        <button @click="showDetailsModal = false" class="px-4 py-2 border rounded hover:bg-gray-100">
          Close
        </button>
      </div>
    </div>
  </div>
</transition>


</template>

<style scoped>
.bg-primary {
  background-color: #00bfa5;
}
.text-primary {
  color: #00bfa5;
}
</style>