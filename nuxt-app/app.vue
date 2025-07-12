<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '~/stores/user'


 
const showInitialLoader = useState('initialLoading', () => true)
const userStore = useUserStore()


useHead({
   script: [{ src: "https://cdn.tailwindcss.com", defer: true }],
   title: "ISC Depot",
   });



  onMounted(async () => {

    const token = useCookie('token')
  if (token.value && !userStore.fetched) {
    await userStore.fetchUser()
  }
       try {
            await new Promise((resolve) => setTimeout(resolve, 1500)) // simulate delay
            } finally {
            showInitialLoader.value = false
         }
})
</script>
<template>
  

     

    <div v-if="showInitialLoader"  class="fixed inset-0 flex flex-col items-center justify-center bg-white z-50 space-y-4">
  <!-- Image on top -->
  <img
    src="/logonew1.png"
    alt="Loading..."
    class="w-24 h-24"
  />

  <!-- Spinner below image -->
  <div
    class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"
  ></div>
</div>


 
    <div class="min-h-screen flex flex-col" v-else>
       <NuxtLayout >
          <NuxtPage />
       </NuxtLayout>
    </div>
</template>
