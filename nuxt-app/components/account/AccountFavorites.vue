<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCartStore } from '~/stores/cart'
import * as Toastification from 'vue-toastification'

const { $axios, $r2Url } = useNuxtApp()
const cart = useCartStore()
const toast = Toastification.useToast()
const { t, productName } = useStorefrontLocale()

interface FavImg { Image_Path: string }
interface FavProduct {
  id: number
  Slug: string
  Product_Name: string
  Product_Price: number
  images?: FavImg[]
  Weight_Kg?: number
  Length_Cm?: number
  Width_Cm?: number
  Height_Cm?: number
  Product_Stock?: number
}

const loading = ref(true)
const favorites = ref<FavProduct[]>([])
const removingId = ref<number | null>(null)

const normalizeRows = (rows: any[]): FavProduct[] =>
  rows.map((row: any) => (row?.product ? row.product : row))

const fetchFavorites = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get('/api/favorites', { withCredentials: true })
    favorites.value = Array.isArray(data) ? normalizeRows(data) : []
     
     console.log(data);

  } catch (e) {
    console.error('Failed to load favorites', e)
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async (p: FavProduct) => {
  if (!p || removingId.value) return
  removingId.value = p.id
  try {
    await $axios.post(`/api/favorites/${p.Slug}/toggle`, {}, { withCredentials: true })
    favorites.value = favorites.value.filter(x => x.id !== p.id)
    toast.success(t('favorites.removed'))
  } catch (e) {
    console.error('Failed to update favorite', e)
    toast.error(t('product.favoriteError'))
  } finally {
    removingId.value = null
  }
}

const addToCart = async (p: FavProduct) => {
  await cart.addToCart({
    id: p.id,
    slug: p.Slug,
    name: productName(p),
    Product_Name: p.Product_Name,
    Product_Name_Ar: (p as any).Product_Name_Ar,
    price: p.Product_Price,
    image: p.images?.[0]?.Image_Path || '',
    weight: p.Weight_Kg || 0,
    length: p.Length_Cm || 0,
    width: p.Width_Cm || 0,
    height: p.Height_Cm || 0,
    Product_Stock: p.Product_Stock || 0,
  }, 1)
  toast.success(t('favorites.addedToCart'))
}

onMounted(fetchFavorites)
</script>

<template>
  <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold text-slate-900">{{ t('account.favorites') }}</h2>
      <span class="text-xs text-slate-500">{{ t(favorites.length === 1 ? 'common.item' : 'common.items', { count: favorites.length }) }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="i in 6" :key="i" class="animate-pulse rounded-xl border border-slate-200 p-3">
        <div class="h-28 bg-slate-100 rounded-md mb-3"></div>
        <div class="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-slate-100 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!favorites.length" class="text-center py-12 text-slate-500">
      <div class="text-3xl mb-2">♡</div>
      <p>{{ t('favorites.empty') }}</p>
      <p class="text-xs">{{ t('favorites.hint') }}</p>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="p in favorites"
        :key="p.id"
        class="group rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <NuxtLink :to="`/product/${p.Slug}`" class="block">
          <div class="aspect-[4/3] bg-slate-50 grid place-items-center">
            <img
              :src="p.images?.[0]?.Image_Path ? `${$r2Url}/${p.images[0].Image_Path}` : ''"
              :alt="productName(p)"
              class="max-h-40 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        </NuxtLink>

        <div class="p-3 space-y-2">
          <NuxtLink :to="`/product/${p.Slug}`" class="block text-sm font-medium text-slate-900 line-clamp-2">
            {{ productName(p) }}
          </NuxtLink>
          <div class="text-emerald-600 font-semibold text-sm">{{ t('common.omr') }} {{ p.Product_Price }}</div>

          <div class="flex items-center gap-2 pt-1">
            <button
              @click="addToCart(p)"
              class="flex-1 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-medium py-2 hover:opacity-95"
            >
              {{ t('product.addToCart') }}
            </button>

            <button
              @click="toggleFavorite(p)"
              :disabled="removingId === p.id"
              class="h-9 w-9 inline-grid place-items-center rounded-lg ring-1 ring-slate-200 bg-white hover:bg-rose-50 disabled:opacity-60"
              :aria-pressed="true"
              :title="t('favorites.removeTitle')"
            >
              <svg v-if="removingId !== p.id" class="h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 21s-6.72-4.35-9.54-7.17A6.37 6.37 0 0 1 3 3.88a5 5 0 0 1 7.07 0l1.92 1.93 1.93-1.93A5 5 0 0 1 21 3.88a6.37 6.37 0 0 1 .55 9.95C18.73 16.65 12 21 11.99 21z"/>
              </svg>
              <svg v-else class="h-5 w-5 text-rose-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 21s-6.72-4.35-9.54-7.17A6.37 6.37 0 0 1 3 3.88a5 5 0 0 1 7.07 0l1.92 1.93 1.93-1.93A5 5 0 0 1 21 3.88a6.37 6.37 0 0 1 .55 9.95C18.73 16.65 12 21 11.99 21z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
