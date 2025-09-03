<script setup lang="ts">
import { useToast } from 'vue-toastification'

type UserLite = {
  User_Name?: string | null
  Email?: string | null
  Telephone?: string | null
  Username?: string | null
  avatarUrl?: string | null
}

// remove emits; we’ll call the API from here
const props = defineProps<{
  user?: UserLite
  loading?: boolean
}>()

const { $axios } = useNuxtApp()
const toast = useToast()

const serverLoading = ref(false)      // loading for fetch
const saving = ref(false)             // loading for save
const errors = reactive<Record<string, string[]>>({})

const fallbackAvatar = 'https://i.pravatar.cc/100'

// local form state
const form = reactive({
  name: props.user?.User_Name ?? '',
  username: props.user?.Username ?? '',
  email: props.user?.Email ?? '',
  phone: props.user?.Telephone ?? '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  newsletter: true,
})

watch(() => props.user, (u) => {
  if (!u) return
  form.name = u.User_Name ?? ''
  form.username = u.Username ?? ''
  form.email = u.Email ?? ''
  form.phone = u.Telephone ?? ''
}, { immediate: true })

// avatar (client-only preview; API not implemented here)
const fileInput = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(props.user?.avatarUrl ?? null)

const onAvatarChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}
const removeAvatar = () => {
  avatarFile.value = null
  avatarPreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// visibility toggles
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

// derived
const passwordMismatch = computed(
  () => !!form.newPassword && form.newPassword !== form.confirmPassword
)

const dirty = computed(() => {
  return (
    form.name !== (props.user?.User_Name ?? '') ||
    form.username !== (props.user?.Username ?? '') ||
    form.email !== (props.user?.Email ?? '') ||
    form.phone !== (props.user?.Telephone ?? '') ||
    !!avatarFile.value ||
    !!form.currentPassword ||
    !!form.newPassword ||
    form.newsletter !== true
  )
})

const canSave = computed(() => {
  const basicOk = !!form.name && !!form.email
  const pwdOk = !form.newPassword || (!passwordMismatch.value && form.currentPassword.length > 0)
  return basicOk && pwdOk
})

// --- API: FETCH ---
const fetchProfile = async () => {
  serverLoading.value = true
  Object.keys(errors).forEach(k => delete errors[k])
  try {
    const { data } = await $axios.get('/api/account/profile', { withCredentials: true })
    form.name = data.name || ''
    form.username = data.username || ''
    form.email = data.email || ''
    form.phone = data.phone || ''
  } catch (e:any) {
    toast.error(e?.response?.data?.message || 'Failed to load profile')
  } finally {
    serverLoading.value = false
  }
}


const onSave = async () => {
  
  if (!canSave.value) return
  saving.value = true
  Object.keys(errors).forEach(k => delete errors[k])
  const payload = {
  name: form.name,            // Customers_Master_T.Customer_Full_Name
  username: form.username,    // Secx_User_Master_T.User_Name
  email: form.email,          // Secx_User_Master_T.email
  phone: form.phone,          // Customers_Master_T.Telephone
  newPassword: form.newPassword || undefined, // Secx_User_Master_T.password (hashed)
}

  try {
    await $axios.put('/api/account/profile', {
        payload,
    }, { 
        withCredentials: true, 
        
        })

    toast.success('Profile updated')
   
  } catch (e:any) {
   


  } finally {
    saving.value = false
  }
}

const resetForm = async () => {

  await fetchProfile()
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  form.newsletter = true
  avatarFile.value = null
  avatarPreview.value = props.user?.avatarUrl ?? null
  if (fileInput.value) fileInput.value.value = ''
}

// initial load
onMounted(async () => {
  await fetchProfile()
})
</script>

<template>
  <section class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-900">Profile</h2>
      <div class="text-xs text-slate-500">Keep your information up to date</div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Top Bar -->
      <div class="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div class="text-sm font-medium text-slate-700">Personal Information</div>
        <span
          v-if="dirty"
          class="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded ring-1 ring-amber-200"
        >
          • Unsaved changes
        </span>
      </div>

      <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Avatar -->
        <div class="lg:col-span-1">
          <div class="flex items-start gap-4">
            <img
              :src="avatarPreview || fallbackAvatar"
              alt="Avatar"
              class="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow"
            />
            <div class="space-y-2">
              <div class="text-sm font-medium text-slate-900">{{ form.name || 'Your Name' }}</div>
              <div class="text-xs text-slate-500">Shown on orders & invoices</div>
              <div class="flex items-center gap-2">
                <label class="relative inline-flex items-center">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onAvatarChange"
                  />
                  <button
                    type="button"
                    class="text-xs font-semibold bg-white text-slate-700 px-3 py-1.5 rounded-md ring-1 ring-slate-200 hover:bg-slate-50"
                    @click="fileInput?.click()"
                  >
                    Change
                  </button>
                </label>
                <button
                  v-if="avatarPreview"
                  type="button"
                  class="text-xs font-semibold text-red-600 hover:text-red-700"
                  @click="removeAvatar"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Form: name / username / email / phone -->
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              v-model.trim="form.name"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Username</label>
            <input
              v-model.trim="form.username"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="Your username"
              @input="form.username = form.username.replace(/\s/g, '')"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              v-model.trim="form.email"
              type="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              v-model.trim="form.phone"
              type="tel"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="+968 9XXXXXXX"
            />
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/60">
        <div class="text-sm font-medium text-slate-700">Security</div>
      </div>

      <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-1">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Current Password</label>
          <div class="relative">
            <input
              :type="showCurrent ? 'text' : 'password'"
              v-model="form.currentPassword"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              @click="showCurrent = !showCurrent"
              aria-label="Toggle current password visibility"
            >
              <svg v-if="showCurrent" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
          <div class="relative">
            <input
              :type="showNew ? 'text' : 'password'"
              v-model="form.newPassword"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="At least 8 characters"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              @click="showNew = !showNew"
              aria-label="Toggle new password visibility"
            >
              <svg v-if="showNew" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
          <div class="relative">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="form.confirmPassword"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="Re-enter new password"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              @click="showConfirm = !showConfirm"
              aria-label="Toggle confirm password visibility"
            >
              <svg v-if="showConfirm" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>

          <p v-if="passwordMismatch" class="mt-1 text-xs text-red-600">
            Passwords don’t match.
          </p>
        </div>
      </div>

      <!-- Preferences -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/60">
        <div class="text-sm font-medium text-slate-700">Preferences</div>
      </div>

      <div class="p-4">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="form.newsletter" class="rounded border-slate-300 text-cyan-600" />
          Subscribe to newsletter
        </label>
      </div>

      <!-- Actions -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
        <button
          type="button"
          class="text-sm font-medium px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100"
          @click="resetForm"
        >
          Reset
        </button>
        <button
              type="button"
              class="text-sm font-semibold px-4 py-2 rounded-md text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-sm disabled:opacity-50"
              :disabled="!canSave || saving || serverLoading"
              @click="onSave"
            >
          <span v-if="loading" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
          Save Changes
        </button>
      </div>
    </div>
  </section>
</template>



