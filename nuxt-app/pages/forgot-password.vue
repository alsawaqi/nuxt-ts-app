 <script setup lang="ts">
definePageMeta({ layout: 'layouts', middleware: 'guest' })

import { ref, reactive } from 'vue'

const { $axios } = useNuxtApp()

const form = reactive({ email: '' })
const isSubmitting = ref(false)
const errorMsg = ref('')
const sent = ref(false)

const submitForgot = async () => {
  errorMsg.value = ''
  if (!form.email) {
    errorMsg.value = 'Please enter your email address.'
    return
  }
  isSubmitting.value = true
  try {
    await $axios.post('/api/forgot-password', { email: form.email })
    sent.value = true
  } catch (e: any) {
    errorMsg.value =
      e?.response?.data?.message ||
      'We couldn’t send a reset link. Please try again.'
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

          <!-- Heading -->
          <div class="text-center mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">
              Forgot your password?
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Enter your email and we’ll send you a reset link.
            </p>
          </div>

          <!-- Error -->
          <div
            v-if="errorMsg && !sent"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm"
          >
            {{ errorMsg }}
          </div>

          <!-- Success state -->
          <transition name="fade">
            <div
              v-if="sent"
              class="text-center space-y-3 py-2"
              aria-live="polite"
            >
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
                Check your inbox
              </h2>
              <p class="text-sm text-slate-600">
                If an account exists for <span class="font-medium">{{ form.email }}</span>,
                you’ll receive an email with a link to reset your password.
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
          </transition>

          <!-- Form -->
          <form @submit.prevent="submitForgot" class="space-y-4">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-slate-700 mb-1"
                >Email</label
              >
              <div class="relative">
                <span
                  class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400"
                >
                  <!-- mail icon -->
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      d="M2.94 6.34A2 2 0 014.6 5h10.8a2 2 0 011.67.94l-7.07 4.12a1.5 1.5 0 01-1.53 0L2.94 6.34z"
                    />
                    <path
                      d="M18 8.12v5.38A2.5 2.5 0 0115.5 16h-11A2.5 2.5 0 012 13.5V8.12l6.34 3.7a3 3 0 002.98 0L18 8.12z"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  v-model.trim="form.email"
                  autocomplete="email"
                  class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5
                         text-slate-900 placeholder-slate-400 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
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
              <span>{{ isSubmitting ? 'Sending…' : 'Send reset link' }}</span>
            </button>

            <p class="text-center text-xs text-slate-500">
              Remember your password?
              <NuxtLink
                to="/login"
                class="font-medium text-cyan-700 hover:underline"
                >Back to login</NuxtLink
              >
            </p>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* simple fade for success state */
.fade-enter-active,
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
