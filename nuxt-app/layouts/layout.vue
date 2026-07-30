<script setup lang="ts">
import Footer from '~/layouts/inc/footer.vue'
 
const { dir } = useStorefrontLocale()
</script>
<template>
 <div class="min-h-screen flex flex-col bg-gray-50 text-gray-800" :dir="dir">
    <div class="flex-1">
      <slot />
    </div>
    <Footer />
 </div>
</template>
