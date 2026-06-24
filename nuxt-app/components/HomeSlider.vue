<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'

type Slide = {
  id: number
  Title?: string | null
  Title_Ar?: string | null
  Description?: string | null
  Description_Ar?: string | null
  Button_Text?: string | null
  Button_Text_Ar?: string | null
  Link_Url?: string | null
  Image_Path: string
  image_url?: string | null
}

const { $axios } = useNuxtApp() as any
const config = useRuntimeConfig()
const { field } = useStorefrontLocale()

const slides = ref<Slide[]>([])
const loading = ref(true)

const publicR2Base = () => String(config.public.r2Url || '').replace(/\/+$/, '')

function normalizeSliderImagePath(value?: string | null) {
  const raw = String(value || '').trim().replace(/\\/g, '/')
  if (!raw) return ''

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      if (url.hostname.includes('r2.dev')) return raw

      const path = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const sliderIndex = path.indexOf('Sliders/')
      if (sliderIndex >= 0) return path.slice(sliderIndex)

      const segments = path.split('/').filter(Boolean)
      if (url.hostname.includes('r2.cloudflarestorage.com') && segments.length > 1) {
        segments.shift()
        return segments.join('/')
      }

      return raw
    } catch {
      return raw
    }
  }

  const path = raw.replace(/^\/+/, '')
  const sliderIndex = path.indexOf('Sliders/')
  return sliderIndex >= 0 ? path.slice(sliderIndex) : path
}

const img = (slide: Slide) => {
  const base = publicR2Base()
  const path = normalizeSliderImagePath(slide.Image_Path || slide.image_url)
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return encodeURI(`${base}/${path}`)
}

const slideTitle = (slide: Slide) => field(slide, 'Title')
const slideDescription = (slide: Slide) => field(slide, 'Description')
const slideButton = (slide: Slide) => field(slide, 'Button_Text')

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
  <section v-if="loading || slides.length" class="relative isolate overflow-hidden bg-slate-900">
    <ClientOnly>
      <Swiper
        v-if="slides.length"
        :modules="[Autoplay, Pagination]"
        :loop="slides.length > 1"
        :autoplay="slides.length > 1 ? { delay: 5000, disableOnInteraction: false } : false"
        :pagination="slides.length > 1 ? { clickable: true } : false"
        class="w-full"
      >
        <SwiperSlide v-for="s in slides" :key="s.id">
          <NuxtLink v-if="s.Link_Url" :to="s.Link_Url" class="relative block home-slide">
            <img :src="img(s)" class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover" :alt="slideTitle(s) || 'Advertisement slider'" />
            <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-900/48 to-transparent"></div>
            <div aria-hidden="true" class="absolute inset-0 hero-wash [mask-image:radial-gradient(80%_60%_at_20%_40%,black,transparent)] bg-[linear-gradient(to_right,#c2ff4a33,#22d3ee33_35%,transparent_70%)]"></div>
            <div class="absolute inset-0 flex items-center">
              <div class="max-w-screen-xl mx-auto w-full px-4">
                <div class="max-w-xl">
                  <h1 v-if="slideTitle(s)" class="text-white text-2xl md:text-3xl font-bold">
                    {{ slideTitle(s) }}
                  </h1>
                  <p v-if="slideDescription(s)" class="text-white/85 mt-1 text-sm md:text-base">
                    {{ slideDescription(s) }}
                  </p>
                  <span v-if="slideButton(s)" class="mt-4 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm">
                    {{ slideButton(s) }}
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>

          <div v-else class="relative block home-slide">
            <img :src="img(s)" class="w-full h-[220px] md:h-[300px] lg:h-[360px] object-cover" :alt="slideTitle(s) || 'Advertisement slider'" />
            <div aria-hidden="true" class="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-900/48 to-transparent"></div>
            <div aria-hidden="true" class="absolute inset-0 hero-wash [mask-image:radial-gradient(80%_60%_at_20%_40%,black,transparent)] bg-[linear-gradient(to_right,#c2ff4a33,#22d3ee33_35%,transparent_70%)]"></div>
            <div class="absolute inset-0 flex items-center">
              <div class="max-w-screen-xl mx-auto w-full px-4">
                <div class="max-w-xl">
                  <h1 v-if="slideTitle(s)" class="text-white text-2xl md:text-3xl font-bold">
                    {{ slideTitle(s) }}
                  </h1>
                  <p v-if="slideDescription(s)" class="text-white/85 mt-1 text-sm md:text-base">
                    {{ slideDescription(s) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>

      <template #fallback>
        <div class="w-full h-[220px] md:h-[300px] lg:h-[360px] bg-slate-800" />
      </template>
    </ClientOnly>
  </section>
</template>

<style scoped>
.home-slide {
  min-height: 220px;
}

:deep(.swiper-pagination-bullet) {
  background: rgba(255, 255, 255, 0.88);
  opacity: 0.65;
}

:deep(.swiper-pagination-bullet-active) {
  opacity: 1;
  background: #fff;
}
</style>
