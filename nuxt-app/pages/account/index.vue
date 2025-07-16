<script setup lang="ts">
definePageMeta({
   layout: 'layouts',
   middleware: 'auth',
})


const { user, isAuthenticated } = useAuth()
const { $axios } = useNuxtApp()

interface Order {
   id: number;
  transaction_number: number;
  total_price: string;
  status: string;
  created_at: string;
 
}

const orders = ref<Order[]>([]);
const loading = ref<boolean>(true);

const getorders = async (): Promise<void> => {
   loading.value = true;
  try {
    const response = await $axios.get('/api/orders', {headers: {Authorization: `Bearer ${useCookie('token').value}`,},});
    
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
                <td class="px-4 py-3 font-semibold">{{ order.transaction_number }}</td>
                <td class="px-4 py-3">{{ order.created_at }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'font-medium',
                      order.status === 'Canceled' ? 'text-red-500' :
                      order.status === 'In Progress' ? 'text-blue-500' :
                      order.status === 'Delayed' ? 'text-orange-500' :
                      'text-green-500'
                    ]"
                  >
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-4 py-3 font-semibold">OMR {{ order.total_price }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="text-blue-600 hover:underline text-sm">Order Details</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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