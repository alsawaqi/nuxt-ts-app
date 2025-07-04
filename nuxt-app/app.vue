<script setup lang="ts">
const showInitialLoader = useState('initialLoading', () => true)
useHead({
   script: [{ src: "https://cdn.tailwindcss.com", defer: true }],
   title: "ISC Depot",
   });

  onMounted(async () => {
  try {
    // Example: wait for some startup data (axios, config, etc.)
    await new Promise((resolve) => setTimeout(resolve, 1500)) // simulate delay
  } finally {
    showInitialLoader.value = false
  }
})
</script>
<template>

 
    <div v-if="showInitialLoader" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <img src="/logonew1.png" alt="Loading..." class="w-24 h-24" />
    </div>

     <div class="min-h-screen flex flex-col" v-else>
       <NuxtLayout >
          <NuxtPage />
       </NuxtLayout>

   </div>
</template>
