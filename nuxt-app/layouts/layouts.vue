<script setup lang="ts">
import Footer from '~/layouts/inc/footer.vue'
import Header from '~/layouts/inc/header.vue'

const { dir } = useStorefrontLocale()
</script>
<template>
 <div class="min-h-screen flex flex-col bg-gray-50 text-gray-800" :dir="dir">
    <Header />
    <div class="flex-1">
      <slot />
    </div>
    <Footer />
 </div>
</template>
