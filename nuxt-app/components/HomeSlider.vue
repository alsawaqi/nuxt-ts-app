<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'

type Slide = {
  id: number
  Title?: string | null
  Title_Ar?: string | null
  Link_Url?: string | null
  Image_Path: string
}

const { $axios } = useNuxtApp() as any
const config = useRuntimeConfig()

const slides = ref<Slide[]>([])
const loading = ref(true)

const img = (p: string) => `${config.public.r2Url}/${p}`

onMounted(async () => {
  try {
    slides.value = await $axios.get('/api/ui-sliders').then((r: any) => r.data)
  } finally {
    loading.value = false
  }
})

// Swiper (client-only)
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
</script>

<template>
  <section class="relative isolate overflow-hidden bg-slate-900">
    <ClientOnly>
      <Swiper
        v-if="slides.length"
        :modules="[Autoplay, Pagination]"
        :loop="true"
        :autoplay="{ delay: 5000, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        class="w-full"
      >
        <SwiperSlide v-for="s in slides" :key="s.id">
          <NuxtLink v-if="s.Link_Url" :to="s.Link_Url" class="block">
            <img :src="img(s.Image_Path)" class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover" />
          </NuxtLink>
          <img v-else :src="img(s.Image_Path)" class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover" />
        </SwiperSlide>
      </Swiper>

      <template #fallback>
        <div class="w-full h-[220px] md:h-[300px] lg:h-[360px] bg-slate-800" />
      </template>
    </ClientOnly>
  </section>
</template>