<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
const { $axios } = useNuxtApp()
const { t: tr } = useStorefrontLocale()

type TicketType = 'feedback' | 'return' | 'support'
type TicketStatus = 'open' | 'pending' | 'closed'

interface Ticket {
  id: number
  reference?: string
  subject: string
  type: TicketType
  order_id?: number | null
  status: TicketStatus
  created_at: string
  updated_at?: string
}

interface TicketMessage {
  id: number
  ticket_id: number
  sender: 'user' | 'support'
  body: string
  created_at: string
}

/* ---- Local state ---- */
const tickets = ref<Ticket[]>([])
const loading = ref(false)
const creating = ref(false)

const activeTicket = ref<Ticket | null>(null)
const messages = ref<TicketMessage[]>([])
const messagesLoading = ref(false)

/* New ticket form */
const form = reactive({
  type: 'support' as TicketType,
  subject: '',
  order_id: '' as string | number | '',
  description: '',
})
const canSubmit = computed(() =>
  form.subject.trim().length >= 4 && form.description.trim().length >= 10
)
const submitting = computed(() => creating.value)

/* Filters / search */
const filterStatus = ref<'all' | TicketStatus>('all')
const search = ref('')
const filtered = computed(() => {
  let list = tickets.value || []
  if (filterStatus.value !== 'all') {
    list = list.filter(t => t.status === filterStatus.value)
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      (t.reference || '').toLowerCase().includes(q)
    )
  }
  return list
})

/* UI helpers */
const statusChip = (s: TicketStatus) => ({
  open:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending:'bg-amber-50  text-amber-700  ring-amber-200',
  closed: 'bg-slate-100  text-slate-600  ring-slate-200',
}[s])
const statusDot = (s: TicketStatus) => ({
  open:   'bg-emerald-500',
  pending:'bg-amber-500',
  closed: 'bg-slate-400',
}[s])

const statusLabel = (status: TicketStatus | string) => tr(`account.status.${status}`)
const typeLabel = (type: TicketType | string) => ({
  support: tr('tickets.generalSupport'),
  feedback: tr('tickets.feedback'),
  return: tr('tickets.returnRefund'),
}[String(type)] ?? String(type))

/* Reply box */
const replyText = ref('')

/* ---- API calls ---- */
const loadTickets = async () => {
  loading.value = true
  try {
    const res = await $axios.get('/api/tickets', { withCredentials: true })
    tickets.value = res.data
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
   
  creating.value = true
  try {
    await $axios.post('/api/tickets', {
      type: form.type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      order_id: form.order_id === '' ? null : Number(form.order_id),
    }, { withCredentials: true })

    form.type = 'support'
    form.subject = ''
    form.description = ''
    form.order_id = ''

    await loadTickets()
  } finally {
    creating.value = false
  }
}

const openTicket = async (id: number) => {
  messagesLoading.value = true
  try {
    const res = await $axios.get(`/api/tickets/${id}`, { withCredentials: true })
    activeTicket.value = res.data.ticket
    messages.value = res.data.messages
  } finally {
    messagesLoading.value = false
  }
}

const sendReply = async () => {
  if (!activeTicket.value || !replyText.value.trim()) return
  const id = activeTicket.value.id
  await $axios.post(`/api/tickets/${id}/reply`, { body: replyText.value }, { withCredentials: true })
  replyText.value = ''
  await openTicket(id)
}

const closeTicket = async (id: number) => {
  await $axios.patch(`/api/tickets/${id}/close`, {}, { withCredentials: true })
  await loadTickets()
  if (activeTicket.value?.id === id) await openTicket(id) // refresh detail if open
}

onMounted(loadTickets)
</script>

<template>
  <section class="space-y-5">
    <!-- Header / toolbar -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">{{ tr('tickets.title') }}</h2>
        <p class="text-xs text-slate-500">{{ tr('tickets.subtitle') }}</p>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative">
          <input
            v-model.trim="search"
            type="text"
            :placeholder="tr('tickets.searchPlaceholder')"
            class="rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <svg class="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4a6 6 0 104.472 10.03l4.249 4.249 1.414-1.414-4.25-4.25A6 6 0 0010 4z"/>
          </svg>
        </div>

        <select
          v-model="filterStatus"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">{{ tr('orders.all') }}</option>
          <option value="open">{{ tr('account.status.open') }}</option>
          <option value="pending">{{ tr('account.status.pending') }}</option>
          <option value="closed">{{ tr('account.status.closed') }}</option>
        </select>

        <button
          type="button"
          @click="loadTickets"
          class="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
          :title="tr('tickets.refresh')"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 01-9.9 1h-2.02A7 7 0 0019 13c0-3.87-3.13-7-7-7z"/></svg>
          {{ tr('tickets.refresh') }}
        </button>
      </div>
    </div>

    <!-- New ticket -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-emerald-50">
        <div class="text-sm font-medium text-slate-700">{{ tr('tickets.submitNew') }}</div>
      </div>

      <form @submit.prevent="submitForm" class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">{{ tr('tickets.type') }}</label>
          <select v-model="form.type"
                  class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="support">{{ tr('tickets.generalSupport') }}</option>
            <option value="feedback">{{ tr('tickets.feedback') }}</option>
            <option value="return">{{ tr('tickets.returnRefund') }}</option>
          </select>
          <p v-if="form.type === 'return'" class="mt-2 text-xs text-slate-500">
            {{ tr('tickets.policyPrefix') }}
            <NuxtLink to="/policies/returns" class="font-medium text-cyan-700 hover:text-cyan-900">{{ tr('tickets.returnsPolicy') }}</NuxtLink>
            {{ tr('tickets.and') }}
            <NuxtLink to="/policies/warranty" class="font-medium text-cyan-700 hover:text-cyan-900">{{ tr('tickets.warrantyPolicy') }}</NuxtLink>
            {{ tr('tickets.policySuffix') }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">{{ tr('tickets.relatedOrder') }}</label>
          <input
            v-model="form.order_id"
            type="number"
            placeholder="e.g. 10293"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            min="1"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">{{ tr('tickets.subject') }}</label>
          <input
            v-model.trim="form.subject"
            type="text"
            :placeholder="tr('tickets.subjectPlaceholder')"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            maxlength="120"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-slate-700 mb-1">{{ tr('tickets.description') }}</label>
          <textarea
            v-model.trim="form.description"
            rows="4"
            :placeholder="tr('tickets.descriptionPlaceholder')"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <p class="mt-1 text-xs text-slate-500">{{ tr('tickets.sensitiveHint') }}</p>
        </div>

        <div class="md:col-span-2 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
            @click="form.subject=''; form.description=''; form.order_id=''; form.type='support'"
          >
            {{ tr('orders.clear') }}
          </button>
          <button
            type="submit"
         
            class="inline-flex items-center gap-2 rounded-lg bg-cyan-600 text-white px-3.5 py-2 text-sm font-medium shadow hover:bg-cyan-700 disabled:opacity-60"
          >
            <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/>
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" class="opacity-75"/>
            </svg>
            {{ tr('tickets.submit') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tickets list -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div class="text-sm font-medium text-slate-700">{{ tr('tickets.myTickets') }}</div>
        <div class="text-xs text-slate-500">{{ tr('tickets.showing', { shown: filtered.length, total: tickets?.length || 0 }) }}</div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50">
            <tr class="text-slate-600">
              <th class="px-4 py-3 text-left font-semibold">{{ tr('tickets.ref') }}</th>
              <th class="px-4 py-3 text-left font-semibold">{{ tr('tickets.subject') }}</th>
              <th class="px-4 py-3 text-left font-semibold">{{ tr('tickets.type') }}</th>
              <th class="px-4 py-3 text-left font-semibold">{{ tr('orders.status') }}</th>
              <th class="px-4 py-3 text-left font-semibold">{{ tr('tickets.created') }}</th>
              <th class="px-4 py-3 text-right font-semibold">{{ tr('orders.actions') }}</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-6 text-center text-slate-500">{{ tr('tickets.loading') }}</td>
            </tr>

            <tr
              v-for="t in filtered"
              :key="t.id"
              class="hover:bg-slate-50 transition cursor-pointer"
              @click="openTicket(t.id)"
            >
              <td class="px-4 py-3 font-medium text-slate-900">{{ t.reference ?? ('#' + t.id) }}</td>
              <td class="px-4 py-3 text-slate-800">{{ t.subject }}</td>
              <td class="px-4 py-3 text-slate-700">{{ typeLabel(t.type) }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ring-1"
                  :class="statusChip(t.status)"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="statusDot(t.status)"></span>
                  {{ statusLabel(t.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ t.created_at }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  class="inline-flex items-center gap-2 text-cyan-700 hover:text-cyan-900 font-medium"
                  @click.stop="openTicket(t.id)"
                >
                  {{ tr('tickets.view') }}
                </button>
                <button
                  v-if="t.status !== 'closed'"
                  class="ml-3 inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
                  @click.stop="closeTicket(t.id)"
                >
                  {{ tr('tickets.close') }}
                </button>
              </td>
            </tr>

            <tr v-if="!loading && filtered.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-slate-500">{{ tr('tickets.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail drawer / modal -->
    <div v-if="activeTicket" class="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div class="absolute inset-0 bg-black/40" @click="activeTicket = null"></div>
      <div class="relative w-full md:w-[720px] max-h-[80vh] overflow-hidden rounded-t-2xl md:rounded-2xl bg-white shadow-xl">
        <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div class="text-sm text-slate-500">{{ tr('tickets.ticket', { ref: activeTicket.reference ?? ('#' + activeTicket.id) }) }}</div>
            <div class="text-lg font-semibold text-slate-900">{{ activeTicket.subject }}</div>
          </div>
          <button class="rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 hover:bg-slate-50" @click="activeTicket = null">
            {{ tr('tickets.close') }}
          </button>
        </div>

        <div class="grid grid-rows-[1fr_auto] max-h-[calc(80vh-56px)]">
          <!-- Messages -->
          <div class="overflow-y-auto p-5 space-y-4">
            <div v-if="messagesLoading" class="text-center text-slate-500 py-8">{{ tr('tickets.loadingConversation') }}</div>

            <template v-else-if="messages && messages.length">
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex"
                :class="m.sender === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow"
                  :class="m.sender === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-800'"
                >
                  <div class="whitespace-pre-wrap">{{ m.body }}</div>
                  <div class="mt-1 text-[10px] opacity-80">{{ m.created_at }}</div>
                </div>
              </div>
            </template>

            <div v-else class="text-slate-500 text-sm text-center py-8">
              {{ tr('tickets.noMessages') }}
            </div>
          </div>

          <!-- Reply box -->
          <div class="border-t border-slate-200 p-4 flex gap-2">
            <input
              v-model.trim="replyText"
              type="text"
              :placeholder="tr('tickets.replyPlaceholder')"
              class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              @keyup.enter="sendReply"
            />
            <button
              class="rounded-lg bg-cyan-600 text-white px-3.5 py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-60"
              :disabled="!replyText.trim()"
              @click="sendReply"
            >
              {{ tr('tickets.send') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
