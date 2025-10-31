<script setup lang="ts">
definePageMeta({ layout: 'layouts', middleware: 'guest' })

import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { $axios } = useNuxtApp()

const route = useRoute()
const router = useRouter()

// pull token + email from URL (.../reset-password?token=...&email=...)
const email = ref<string>('')
const token = ref<string>('')

onMounted(() => {
  email.value = (route.query.email as string) || ''
  token.value = (route.query.token as string) || ''
})

// form state
const form = reactive({
  password: '',
  password_confirmation: '',
})

const isSubmitting = ref(false)
const errorMsg = ref('')
const success = ref(false)
const showPass1 = ref(false)
const showPass2 = ref(false)

const isFormValid = computed(() => {
  return (
    form.password.trim() !== '' &&
    form.password_confirmation.trim() !== '' &&
    form.password === form.password_confirmation &&
    token.value !== '' &&
    email.value !== ''
  )
})

const submitReset = async () => {
  errorMsg.value = ''

  if (!isFormValid.value) {
    errorMsg.value = 'Please fill both password fields correctly.'
    return
  }

  isSubmitting.value = true

  try {
    const response = await $axios.post('/api/reset-password', {
      email: email.value,
      token: token.value,
      password: form.password,
      password_confirmation: form.password_confirmation,
    }, {
      validateStatus: (status: number) => status < 500,
    })

    if (response.status !== 200) {
      errorMsg.value = response.data.message || 'Reset failed.'
      return
    }

    success.value = true

    // optional: after a short delay you could router.push('/login')
    // but we'll leave navigation to user for now

  } catch (e: any) {
    errorMsg.value =
      e?.response?.data?.message ||
      'We could not reset your password. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="bg-gray-100">
    <!-- Banner -->
    <div class="w-full h-[220px] overflow-hidden">
      <img
        src="../public/images/banners.jpg"
        alt="Banner"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- Body -->
    <div
      class="min-h-[60vh] bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12"
    >
      <div class="w-full max-w-md">
        <div
          class="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-7 sm:p-8"
        >
          <!-- Logo -->
          <div class="flex justify-center mb-4">
            <img
              src="../public/logonew1.jpg"
              alt="Logo"
              class="h-10 w-auto sm:h-12 mx-auto"
            />
          </div>

          <!-- Heading / Success state -->
          <div v-if="!success" class="text-center mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">
              Set a new password
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Choose a new password for {{ email || 'your account' }}.
            </p>
          </div>

          <div v-else class="text-center space-y-3 py-2" aria-live="polite">
            <div
              class="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"
            >
              <!-- check icon -->
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7L10 17L4 11"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <h2 class="text-lg font-semibold text-slate-900">
              Password updated
            </h2>
            <p class="text-sm text-slate-600">
              Your password has been reset successfully. You can now log in.
            </p>

            <div class="pt-2">
              <NuxtLink
                to="/login"
                class="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800 hover:underline"
              >
                ← Back to Login
              </NuxtLink>
            </div>
          </div>

          <!-- Error -->
          <div
            v-if="errorMsg && !success"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm"
          >
            {{ errorMsg }}
          </div>

          <!-- Form -->
          <form v-if="!success" @submit.prevent="submitReset" class="space-y-4">

            <!-- New password -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                New password
              </label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400"
                >
                  <!-- lock icon -->
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>

                <input
                  :type="showPass1 ? 'text' : 'password'"
                  v-model="form.password"
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2.5
                         text-slate-900 placeholder-slate-400 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  class="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
                  @click="showPass1 = !showPass1"
                >
                  <svg v-if="!showPass1" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                          d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
                    <circle cx="12" cy="12" r="3.25" stroke-width="1.8"/>
                  </svg>
                  <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                          d="M3 3l18 18M9.88 9.88A3.25 3.25 0 0114.12 14.1M6.7 6.7C4.8 7.93 3.4 9.66 2.25 12c0 0 3.75 6.75 9.75 6.75 2.02 0 3.83-.58 5.34-1.47M12 5.25c2.46 0 4.6.92 6.31 2.11A18.2 18.2 0 0121.75 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Confirm password -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Confirm new password
              </label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400"
                >
                  <!-- lock icon -->
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </span>

                <input
                  :type="showPass2 ? 'text' : 'password'"
                  v-model="form.password_confirmation"
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2.5
                         text-slate-900 placeholder-slate-400 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Re-enter password"
                  required
                />

                <button
                  type="button"
                  class="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
                  @click="showPass2 = !showPass2"
                >
                  <svg v-if="!showPass2" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                          d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
                    <circle cx="12" cy="12" r="3.25" stroke-width="1.8"/>
                  </svg>
                  <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                          d="M3 3l18 18M9.88 9.88A3.25 3.25 0 0114.12 14.1M6.7 6.7C4.8 7.93 3.4 9.66 2.25 12c0 0 3.75 6.75 9.75 6.75 2.02 0 3.83-.58 5.34-1.47M12 5.25c2.46 0 4.6.92 6.31 2.11A18.2 18.2 0 0121.75 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="w-full inline-flex items-center justify-center rounded-lg
                     bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold
                     py-2.5 shadow-sm hover:opacity-95 disabled:opacity-60 transition"
            >
              <svg
                v-if="isSubmitting"
                class="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>

              <span>{{ isSubmitting ? 'Updating…' : 'Reset password' }}</span>
            </button>

            <!-- Back to login link -->
            <p class="text-center text-xs text-slate-500">
              Remembered your password?
              <NuxtLink
                to="/login"
                class="font-medium text-cyan-700 hover:underline"
              >
                Back to login
              </NuxtLink>
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
