<script setup lang="ts">
import { localImageSource } from '~/utils/storefrontDelivery.js'
const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  width?: number
  height?: number
  sizes?: string
  loading?: 'lazy' | 'eager'
  fetchpriority?: 'high' | 'low' | 'auto'
  fallback?: string
}>(), { alt: '', width: 320, height: 320, sizes: '160px sm:220px xl:250px', loading: 'lazy', fetchpriority: 'auto', fallback: '/images/image-placeholder.svg' })
const config = useRuntimeConfig()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
const source = computed(() => failed.value ? props.fallback : (localImageSource(props.src, config.public.uploadsUrl) || props.fallback))
</script>

<template>
  <NuxtImg :src="source" :alt="alt" :width="width" :height="height" :sizes="sizes"
    format="webp" :quality="78" fit="inside" :loading="loading" :fetchpriority="fetchpriority"
    decoding="async" @error="failed = true" />
</template>
