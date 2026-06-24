<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const emit = defineEmits<{ changed: [] }>()
const { $axios } = useNuxtApp()
const { t } = useStorefrontLocale()

type ReadFilter = 'all' | 'unread' | 'read'

interface CustomerNotification {
  id: string
  type: string
  category?: string | null
  title: string
  message: string
  url?: string | null
  read_at?: string | null
  created_at?: string | null
}

const notifications = ref<CustomerNotification[]>([])
const loading = ref(false)
const readFilter = ref<ReadFilter>('all')
const unreadCount = ref(0)

const filteredLabel = computed(() => {
  if (readFilter.value === 'unread') return t('notifications.unread')
  if (readFilter.value === 'read') return t('notifications.read')
  return t('notifications.all')
})

const categoryLabel = (category?: string | null) => {
  const labels: Record<string, string> = {
    order_update: t('notifications.category.order'),
    return_refund: t('notifications.category.return'),
    ticket_reply: t('notifications.category.support'),
    back_in_stock: t('notifications.category.stock'),
    admin_message: t('notifications.category.account'),
  }

  return labels[String(category || '')] || t('notifications.category.notice')
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const { data } = await $axios.get('/api/notifications', {
      withCredentials: true,
      params: { read: readFilter.value },
    })
    notifications.value = data?.data ?? []
    unreadCount.value = Number(data?.unread_count ?? 0)
    emit('changed')
  } finally {
    loading.value = false
  }
}

const markRead = async (notification: CustomerNotification) => {
  if (notification.read_at) {
    if (notification.url) await navigateTo(notification.url)
    return
  }

  const { data } = await $axios.patch(`/api/notifications/${notification.id}/read`, {}, { withCredentials: true })
  unreadCount.value = Number(data?.unread_count ?? Math.max(unreadCount.value - 1, 0))
  notification.read_at = data?.data?.read_at ?? new Date().toISOString()
  emit('changed')

  if (notification.url) await navigateTo(notification.url)
}

const markAllRead = async () => {
  await $axios.post('/api/notifications/mark-all-read', {}, { withCredentials: true })
  notifications.value = notifications.value.map(item => ({
    ...item,
    read_at: item.read_at || new Date().toISOString(),
  }))
  unreadCount.value = 0
  emit('changed')
}

watch(readFilter, loadNotifications)
onMounted(loadNotifications)
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">{{ t('account.notifications') }}</h2>
        <p class="text-xs text-slate-500">{{ t('notifications.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model="readFilter"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">{{ t('notifications.all') }}</option>
          <option value="unread">{{ t('notifications.unread') }}</option>
          <option value="read">{{ t('notifications.read') }}</option>
        </select>
        <button
          type="button"
          class="rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          :disabled="unreadCount === 0"
          @click="markAllRead"
        >
          {{ t('notifications.markAllRead') }}
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium text-slate-700">{{ t('notifications.filtered', { label: filteredLabel }) }}</span>
        <span class="rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">{{ t('notifications.unreadCount', { count: unreadCount }) }}</span>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div v-if="loading" class="p-8 text-center text-sm text-slate-500">{{ t('notifications.loading') }}</div>

      <template v-else>
        <button
          v-for="notification in notifications"
          :key="notification.id"
          type="button"
          class="grid w-full gap-2 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
          :class="notification.read_at ? 'bg-white' : 'bg-cyan-50/50'"
          @click="markRead(notification)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {{ categoryLabel(notification.category) }}
            </span>
            <span v-if="!notification.read_at" class="rounded-md bg-cyan-600 px-2 py-1 text-xs font-medium text-white">
              {{ t('notifications.new') }}
            </span>
            <span class="ml-auto text-xs text-slate-500">{{ notification.created_at || '' }}</span>
          </div>
          <div>
            <div class="font-semibold text-slate-900">{{ notification.title }}</div>
            <p class="mt-1 text-sm leading-5 text-slate-600">{{ notification.message }}</p>
          </div>
        </button>
      </template>

      <div v-if="!loading && notifications.length === 0" class="p-10 text-center text-sm text-slate-500">
        {{ t('notifications.empty') }}
      </div>
    </div>
  </section>
</template>
