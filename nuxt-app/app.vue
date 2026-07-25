<script setup lang="ts">
useHead({
  title: 'ISC Depot',
  meta: [
    { name: 'theme-color', content: '#2f5fb6' },
  ],
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
