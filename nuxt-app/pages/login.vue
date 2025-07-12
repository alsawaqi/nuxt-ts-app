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

const submitLogin = async () => {
  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const response = await $axios.post('/api/login', form.value, {
      validateStatus: (status) => status < 500, // ⚠️ Catch 401 manually
    })

    if (response.status === 401 || !response.data.token) {
      errorMsg.value = response.data.message || 'Invalid email or password.'
      return
    }

    const token = response.data.token
    const user = response.data.user

    const tokenCookie = useCookie('token', {
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
    })
    tokenCookie.value = token

    userStore.setUser(user)

    // Redirect to intended page or home
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
      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRPL_9IEteEZqaBS3X5CSoBfG7_-RbLiaN6Q&s" 
      alt="Banner" 
      class="w-full h-full object-cover"
    />
  </div>
  <div class="bg-gray-100 flex items-center justify-center pt-6 pb-16 px-4">

    <div class="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full">
      <h1 class="text-2xl font-bold mb-6 text-center">Login</h1>

      <form @submit.prevent="submitLogin" class="space-y-4">
        <div>
          <label for="email" class="block font-medium mb-1">Email</label>
          <input
            type="email"
            id="email"
            v-model="form.email"
            class="w-full border rounded-md p-2 focus:outline-none focus:ring focus:border-blue-300"
            required
          />
        </div>

        <div>
          <label for="password" class="block font-medium mb-1">Password</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            class="w-full border rounded-md p-2 focus:outline-none focus:ring focus:border-blue-300"
            required
          />
        </div>

        <div v-if="errorMsg" class="text-red-500 text-sm">{{ errorMsg }}</div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center"
          :disabled="isSubmitting"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin h-5 w-5 text-white mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span>{{ isSubmitting ? 'Logging in...' : 'Login' }}</span>
        </button>
      </form>
    </div>
  </div>


  </section>
</template>
