<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
   middleware: 'guest',
})

import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '~/stores/user'

const { $axios } = useNuxtApp()

const form = ref({
  email: '',
  password: '',
})

const isSubmitting = ref(false)
const errorMsg = ref('')
const userStore = useUserStore()

const route = useRoute()
const router = useRouter()

const showPassword = ref(false)
const togglePassword = () => { showPassword.value = !showPassword.value }

// optional (if you don’t already have it)
const remember = ref(false)

 const submitLogin = async () => {
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const response = await $axios.post('/api/login', form.value, {
      withCredentials: true, // ⬅️ This allows the browser to accept the cookie
      validateStatus: (status) => status < 500,
    })

 
    if (response.status === 401 || !response.data.user) {
      errorMsg.value = response.data.message || 'Invalid email or password.'
      return
    }

    userStore.setUser(response.data.user) // ✅ Set user manually

    const redirectTo = route.query.redirect || '/'
    await router.push(redirectTo as string)

  } catch (error: any) {
    errorMsg.value = error?.response?.data?.message || 'Login failed.'
  } finally {
    isSubmitting.value = false
  }
}




</script>

<template>

    <section class="bg-gray-100">


         <div class="w-full h-[250px] overflow-hidden">
              <img 
                src="../public/images/banners.jpg" 
                alt="Banner" 
                class="w-full h-full object-cover"
              />
        </div>
<div class="min-h-[70vh] bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <div class="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-8">
      <!-- Heading -->
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p class="text-sm text-slate-500 mt-1">Sign in to continue to your account</p>
      </div>

      <!-- Error banner -->
      <div v-if="errorMsg" class="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
        {{ errorMsg }}
      </div>

      <!-- Form -->
      <form @submit.prevent="submitLogin" class="space-y-4">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <div class="relative">
            <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
              <!-- mail icon -->
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 6.34A2 2 0 014.6 5h10.8a2 2 0 011.67.94l-7.07 4.12a1.5 1.5 0 01-1.53 0L2.94 6.34z"/><path d="M18 8.12v5.38A2.5 2.5 0 0115.5 16h-11A2.5 2.5 0 012 13.5V8.12l6.34 3.7a3 3 0 002.98 0L18 8.12z"/></svg>
            </span>
            <input
              id="email"
              type="email"
              v-model="form.email"
              autocomplete="email"
              class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5
                     text-slate-900 placeholder-slate-400 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <div class="relative">
            <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
              <!-- lock icon -->
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z" clip-rule="evenodd"/></svg>
            </span>
            <input
              id="password"
              :type="showPassword ? 'text' : 'password'"
              v-model="form.password"
              autocomplete="current-password"
              class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2.5
                     text-slate-900 placeholder-slate-400 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              :aria-pressed="showPassword"
              @click="togglePassword"
              class="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
              title="Show/Hide password"
            >
              <!-- eye / eye-off -->
              <svg v-if="!showPassword" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

          <div class="mt-2 flex items-center justify-between">
            <label class="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" v-model="remember" class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              Remember me
            </label>
            <NuxtLink to="/forgot-password" class="text-xs font-medium text-cyan-700 hover:underline">Forgot password?</NuxtLink>
          </div>
        </div>

        <!-- Submit -->
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
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span>{{ isSubmitting ? 'Logging in…' : 'Login' }}</span>
        </button>

        <!-- Secondary link -->
        <p class="text-center text-xs text-slate-500">
          Don’t have an account?
          <NuxtLink to="/register" class="font-medium text-cyan-700 hover:underline">Create one</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</div>



  </section>
</template>
