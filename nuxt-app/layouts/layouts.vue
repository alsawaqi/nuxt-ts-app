<script setup lang="ts">
import Footer from '~/layouts/inc/footer.vue'
import Header from '~/layouts/inc/header.vue'
</script>
<template>
 <div class="bg-gray-50 text-gray-800">
    <Header />
      <slot />
    <Footer />
 </div>
</template>