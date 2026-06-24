<script setup lang="ts">
import Footer from '~/layouts/inc/footer.vue'
import Header from '~/layouts/inc/header.vue'

const { dir } = useStorefrontLocale()
</script>
<template>
 <div class="bg-gray-50 text-gray-800" :dir="dir">
    <Header />
      <slot />
    <Footer />
 </div>
</template>
