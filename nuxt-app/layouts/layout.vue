<script setup lang="ts">
import Footer from '~/layouts/inc/footer.vue'
 
const { dir } = useStorefrontLocale()
</script>
<template>
 <div class="bg-gray-50 text-gray-800" :dir="dir">
    <slot />
    <Footer />
 </div>
</template>
