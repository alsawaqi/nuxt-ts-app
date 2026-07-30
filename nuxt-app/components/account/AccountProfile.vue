<script setup lang="ts">
import * as Toastification from 'vue-toastification'
import { useUserStore } from '~/stores/user'

type UserLite = {
  User_Name?: string | null
  Email?: string | null
  Telephone?: string | null
  Telephone_Country_Code?: string | null
  Username?: string | null
  avatarUrl?: string | null
}

// remove emits; we’ll call the API from here
const props = defineProps<{
  user?: UserLite
  loading?: boolean
}>()

const { $axios } = useNuxtApp()
const toast = Toastification.useToast()
const userStore = useUserStore()
const { t } = useStorefrontLocale()
const { phoneCountryCodes, digitsOnly, normalizePhoneCode } = usePhoneCountryCodes()

const serverLoading = ref(false)      // loading for fetch
const saving = ref(false)             // loading for save
const errors = reactive<Record<string, string[]>>({})

// local form state
const form = reactive({
  name: props.user?.User_Name ?? '',
  username: props.user?.Username ?? '',
  email: props.user?.Email ?? '',
  phoneCountryCode: normalizePhoneCode(props.user?.Telephone_Country_Code),
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
  form.phoneCountryCode = normalizePhoneCode(u.Telephone_Country_Code)
  form.phone = u.Telephone ?? ''
}, { immediate: true })

const fileInput = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(props.user?.avatarUrl ?? null)
const savedAvatarUrl = ref<string | null>(props.user?.avatarUrl ?? null)
const removeSavedAvatar = ref(false)
const originalProfile = reactive({
  name: props.user?.User_Name ?? '',
  username: props.user?.Username ?? '',
  email: props.user?.Email ?? '',
  phoneCountryCode: normalizePhoneCode(props.user?.Telephone_Country_Code),
  phone: props.user?.Telephone ?? '',
  avatarUrl: (props.user?.avatarUrl ?? null) as string | null,
})

const initials = computed(() => {
  const source = form.name || form.username || form.email || 'U'
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U'
})

const avatarSrc = computed(() => avatarPreview.value || savedAvatarUrl.value || '')

const cleanPhone = () => {
  form.phone = digitsOnly(form.phone)
}

const onAvatarChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error(t('profile.imageTypeError'))
    input.value = ''
    return
  }

  if (file.size > 300 * 1024) {
    toast.error(t('profile.imageSizeError'))
    input.value = ''
    return
  }

  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
  removeSavedAvatar.value = false
}
const removeAvatar = () => {
  avatarFile.value = null
  avatarPreview.value = null
  removeSavedAvatar.value = !!savedAvatarUrl.value
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
    form.name !== originalProfile.name ||
    form.username !== originalProfile.username ||
    form.email !== originalProfile.email ||
    form.phoneCountryCode !== originalProfile.phoneCountryCode ||
    form.phone !== originalProfile.phone ||
    !!avatarFile.value ||
    removeSavedAvatar.value ||
    !!form.newPassword ||
    !!form.confirmPassword ||
    form.newsletter !== true
  )
})

const canSave = computed(() => {
  const basicOk = !!form.name && !!form.email && !!form.phoneCountryCode && (!form.phone || /^\d+$/.test(form.phone))
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
    form.phoneCountryCode = normalizePhoneCode(data.phone_country_code)
    form.phone = data.phone || ''
    savedAvatarUrl.value = data.avatar_url || null
    avatarPreview.value = null
    removeSavedAvatar.value = false

    originalProfile.name = form.name
    originalProfile.username = form.username
    originalProfile.email = form.email
    originalProfile.phoneCountryCode = form.phoneCountryCode
    originalProfile.phone = form.phone
    originalProfile.avatarUrl = savedAvatarUrl.value
  } catch (e:any) {
    toast.error(e?.response?.data?.message || t('profile.loadError'))
  } finally {
    serverLoading.value = false
  }
}


const onSave = async () => {
  
  if (!canSave.value) return
  saving.value = true
  Object.keys(errors).forEach(k => delete errors[k])

  const payload = new FormData()
  payload.append('name', form.name)
  payload.append('username', form.username)
  payload.append('email', form.email)
  payload.append('phone_country_code', form.phoneCountryCode)
  payload.append('phone', digitsOnly(form.phone))
  if (form.newPassword) {
    payload.append('currentPassword', form.currentPassword)
    payload.append('newPassword', form.newPassword)
  }
  if (avatarFile.value) payload.append('avatar', avatarFile.value)
  if (removeSavedAvatar.value) payload.append('remove_avatar', '1')

  try {
    await $axios.post('/api/account/profile', payload, {
      withCredentials: true,
    })

    toast.success(t('profile.updated'))
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    avatarFile.value = null
    removeSavedAvatar.value = false
    if (fileInput.value) fileInput.value.value = ''
    await fetchProfile()
    await userStore.fetchUser(true)
   
  } catch (e:any) {
    if (e?.response?.data?.errors) {
      Object.assign(errors, e.response.data.errors)
      toast.error(Object.values(e.response.data.errors)?.[0]?.[0] || t('profile.updateError'))
    } else {
      toast.error(e?.response?.data?.message || t('profile.updateError'))
    }


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
  avatarPreview.value = null
  removeSavedAvatar.value = false
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
      <h2 class="text-xl font-semibold text-slate-900">{{ t('profile.title') }}</h2>
      <div class="text-xs text-slate-500">{{ t('profile.subtitle') }}</div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Top Bar -->
      <div class="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div class="text-sm font-medium text-slate-700">{{ t('profile.personalInfo') }}</div>
        <span
          v-if="dirty"
          class="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded ring-1 ring-amber-200"
        >
          {{ t('profile.unsaved') }}
        </span>
      </div>

      <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Avatar -->
        <div class="lg:col-span-1">
          <div class="flex items-start gap-4">
            <div class="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-50 text-lg font-bold text-cyan-700 ring-2 ring-white shadow">
              <img
                v-if="avatarSrc"
                :src="avatarSrc"
                :alt="t('profile.imageAlt')"
                class="h-full w-full object-cover"
              />
              <span v-else>{{ initials }}</span>
            </div>
            <div class="space-y-2">
              <div class="text-sm font-medium text-slate-900">{{ form.name || t('profile.yourName') }}</div>
              <div class="text-xs text-slate-500">{{ t('profile.imageHelp') }}</div>
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
                    {{ t('profile.change') }}
                  </button>
                </label>
                <button
                  v-if="avatarSrc"
                  type="button"
                  class="text-xs font-semibold text-red-600 hover:text-red-700"
                  @click="removeAvatar"
                >
                  {{ t('profile.remove') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Form: name / username / email / phone -->
        <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.fullName') }}</label>
            <input
              v-model.trim="form.name"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              :placeholder="t('profile.fullNamePlaceholder')"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.username') }}</label>
            <input
              v-model.trim="form.username"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              :placeholder="t('profile.usernamePlaceholder')"
              @input="form.username = form.username.replace(/\s/g, '')"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.email') }}</label>
            <input
              v-model.trim="form.email"
              type="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.phone') }}</label>
            <div class="grid grid-cols-[120px_1fr] gap-2">
              <select
                v-model="form.phoneCountryCode"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <option v-for="item in phoneCountryCodes" :key="item.code" :value="item.code">
                  {{ item.code }}
                </option>
              </select>
              <input
                v-model.trim="form.phone"
                type="tel"
                inputmode="numeric"
                pattern="[0-9]*"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                placeholder="9XXXXXXX"
                @input="cleanPhone"
              />
            </div>
            <p v-if="errors.phone?.[0]" class="mt-1 text-xs text-red-600">{{ errors.phone[0] }}</p>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/60">
        <div class="text-sm font-medium text-slate-700">{{ t('profile.security') }}</div>
      </div>

      <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-1">
          <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.currentPassword') }}</label>
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
              :aria-label="t('profile.toggleCurrentPassword')"
            >
              <svg v-if="showCurrent" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.newPassword') }}</label>
          <div class="relative">
            <input
              :type="showNew ? 'text' : 'password'"
              v-model="form.newPassword"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              :placeholder="t('profile.newPasswordPlaceholder')"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              @click="showNew = !showNew"
              :aria-label="t('profile.toggleNewPassword')"
            >
              <svg v-if="showNew" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('profile.confirmNewPassword') }}</label>
          <div class="relative">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="form.confirmPassword"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              :placeholder="t('profile.confirmPasswordPlaceholder')"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
              @click="showConfirm = !showConfirm"
              :aria-label="t('profile.toggleConfirmPassword')"
            >
              <svg v-if="showConfirm" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.98 8.223A11.72 11.72 0 002 12s3 7 10 7a10.7 10.7 0 004.777-1.098l-2.027-2.027A5 5 0 019 12c0-.778.179-1.514.498-2.168L6.94 5.274A12.1 12.1 0 003.98 8.223zM14.828 11.414A3 3 0 0012.586 9.17l2.242 2.243zM20.02 15.777A11.71 11.71 0 0022 12s-3-7-10-7c-.963 0-1.887.12-2.762.344l2.09 2.09A10.7 10.7 0 0112 7c7 0 10 5 10 5a12.07 12.07 0 01-1.98 3.777z"/><path d="M3 3l18 18-1.5 1.5L1.5 4.5 3 3z"/></svg>
            </button>
          </div>

          <p v-if="passwordMismatch" class="mt-1 text-xs text-red-600">
            {{ t('profile.passwordMismatch') }}
          </p>
        </div>
      </div>

      <!-- Preferences -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/60">
        <div class="text-sm font-medium text-slate-700">{{ t('profile.preferences') }}</div>
      </div>

      <div class="p-4">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="form.newsletter" class="rounded border-slate-300 text-cyan-600" />
          {{ t('profile.newsletter') }}
        </label>
      </div>

      <!-- Actions -->
      <div class="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
        <button
          type="button"
          class="text-sm font-medium px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100"
          @click="resetForm"
        >
          {{ t('common.reset') }}
        </button>
        <button
              type="button"
              class="inline-flex min-w-[132px] items-center justify-center text-sm font-semibold px-4 py-2 rounded-md text-white bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-sm disabled:opacity-50"
              :disabled="!dirty || !canSave || saving || serverLoading"
              @click="onSave"
            >
          <span v-if="saving" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
          {{ saving ? t('profile.saving') : t('addresses.saveChanges') }}
        </button>
      </div>
    </div>
  </section>
</template>
