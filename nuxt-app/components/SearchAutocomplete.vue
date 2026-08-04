<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
const { $axios } = useNuxtApp()
const { t, productName, categoryName, field } = useStorefrontLocale()

// Props (tweak as needed)
const props = withDefaults(defineProps<{
  placeholder?: string
  minChars?: number
  limit?: number
}>(), {
  placeholder: 'Search by keyword, item, model or part #',
  minChars: 2,
  limit: 10,
})

// Emits: when user selects a product
const emit = defineEmits<{
  (e: 'select', item: any): void
}>()

// State
const q = ref('')
const open = ref(false)
const loading = ref(false)
const results = ref<any[]>([])
const highlightedIndex = ref(-1)
const box = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
let debounceId: number | null = null
let activeReq = 0

// Close on outside click
const onDocClick = (e: MouseEvent) => {
  if (!box.value) return
  if (!box.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// Keyboard nav
function onKeydown(e: KeyboardEvent) {
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    open.value = true
  }
  if (!open.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % results.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value =
      (highlightedIndex.value - 1 + results.value.length) % results.value.length
  } else if (e.key === 'Enter') {
    if (results.value[highlightedIndex.value]) {
      select(results.value[highlightedIndex.value])
    }
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function select(item: any) {
  open.value = false
  emit('select', item)
  q.value = item.Result_Type === 'category' ? categoryName(item) : productName(item)
}

// Debounced fetch
async function runSearch() {
  const term = q.value.trim()
  if (term.length < props.minChars) {
    results.value = []
    open.value = false
    return
  }
  loading.value = true
  const reqId = ++activeReq
  try {
    const { data } = await $axios.get('/api/search/products', {
      params: { q: term, limit: props.limit },
    })
    // Ignore stale responses
    if (reqId !== activeReq) return
    results.value = Array.isArray(data) ? data : []
    open.value = results.value.length > 0
    highlightedIndex.value = results.value.length ? 0 : -1
  } catch (e) {
    // silent fail
  } finally {
    if (reqId === activeReq) loading.value = false
  }
}

watch(q, () => {
  if (debounceId) window.clearTimeout(debounceId)
  debounceId = window.setTimeout(runSearch, 180) // snappy debounce
})

// Simple highlight (no v-html to avoid XSS)
function label(item: any) {
  const name = item.Result_Type === 'category' ? categoryName(item) : productName(item)
  const code = field(item, ['Search_Subtitle', 'Product_Code', 'Product_Sku'])
  const type = item.Result_Type === 'category' ? t('common.category') : t('common.products')
  return { name, code, type }
}
</script>

<template>
  <div ref="box" class="relative">
    <div class="flex min-h-11 items-stretch rounded-full bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#2F5FB6] transition">
      <input
        ref="inputEl"
        v-model="q"
        :placeholder="placeholder"
        @keydown="onKeydown"
        @focus="() => { if (results.length) open = true }"
        type="text"
        class="w-full px-4 sm:px-5 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        aria-autocomplete="list"
        :aria-expanded="open"
        aria-controls="search-listbox"
        role="combobox"
      />
      <button
        class="px-4 sm:px-5 bg-[#2F5FB6] text-white hover:brightness-95 rounded-r-full"
        :aria-label="t('common.search')"
        @click="runSearch"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/>
        </svg>
      </button>
    </div>

    <!-- Dropdown -->
    <transition name="fade-scale">
      <div
        v-show="open"
        id="search-listbox"
        role="listbox"
        class="absolute left-0 right-0 mt-2 rounded-xl bg-white ring-1 ring-slate-200 shadow-2xl overflow-hidden z-50"
      >
        <!-- Loading row -->
        <div v-if="loading" class="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v2A6 6 0 004 12z"/></svg>
          {{ t('common.loading') }}
        </div>

        <!-- Results -->
        <ul v-else class="max-h-[56vh] overflow-auto py-1">
          <li
            v-for="(item,i) in results"
            :key="`${item.Result_Type || 'product'}-${item.id}`"
            :aria-selected="i===highlightedIndex"
            role="option"
            @mouseenter="highlightedIndex = i"
            @mouseleave="highlightedIndex = -1"
            @click="select(item)"
            class="px-4 py-2.5 cursor-pointer text-sm flex items-center gap-3 transition"
            :class="i===highlightedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'"
          >
            <!-- Optional thumbnail if you have it
            <img :src=\"item.image\" class=\"h-8 w-8 rounded object-contain ring-1 ring-slate-200\" />
            -->
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="item.Result_Type === 'category'
                ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'
                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'"
            >
              {{ label(item).type }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-slate-800 truncate">{{ label(item).name }}</div>
              <div class="text-[12px] text-slate-500 truncate" v-if="label(item).code">
                {{ label(item).code }}
              </div>
            </div>
          </li>

          <li v-if="!results.length" class="px-4 py-3 text-sm text-slate-500">{{ t('listing.noProducts') }}</li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity .12s ease, transform .12s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to { opacity: 0; transform: translateY(6px) scale(.98); }
</style>
