<script setup lang="ts">
  definePageMeta({
    layout: 'layouts',
    middleware: 'guest',
  })
import { ref ,watch, computed} from 'vue'
import { useUserStore } from '~/stores/user'

const { $axios } = useNuxtApp()
 
 
interface RegisterForm {
  name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}



interface RegisterErrors {
  name: string
  username: string
  email: string
  password: string
  password_confirmation: string
}

const isSubmitting = ref<boolean>(false);
 
const success = ref<boolean>(false);


const form = ref<RegisterForm>({
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: ''
})


const errors = reactive<RegisterErrors>({
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
})



const showPass = ref(false)
const showPass2 = ref(false)
const togglePass = () => (showPass.value = !showPass.value)
const togglePass2 = () => (showPass2.value = !showPass2.value)


const validateEmail = (): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.value.email) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(form.value.email)) {
    errors.email = 'Please enter a valid email address';
  } else {
    errors.email = '';
  }
};


watch(() => form.value.username, (val: string) => {
  errors.username = val.includes(' ')
    ? 'Username should not contain spaces.'
    : ''
})

watch(() => form.value.password_confirmation, async (val)  => {
  errors.password_confirmation =
    val !== form.value.password ? 'Passwords do not match.' : ''
})



const isFormValid = computed((): boolean => {
  return (
    form.value.name.trim() !== '' &&
    form.value.username.trim() !== '' &&
    !form.value.username.includes(' ') &&
    form.value.email.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email) &&
    form.value.password !== '' &&
    form.value.password_confirmation !== '' &&
    form.value.password === form.value.password_confirmation &&
    Object.values(errors).every(error => error === '')
  )
})

const submitForm = async (): Promise<void> => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    const response = await $axios.post('/api/register', form.value)

    const token = response.data.token
    const user = response.data.user

    if (token) {
      // ✅ Set token cookie with expiry
      const tokenCookie = useCookie('token', {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
        watch: true,
      })
      tokenCookie.value = token

      // ✅ Set user
      const userStore = useUserStore()
      userStore.setUser(user)
    }

    success.value = true
  } catch (error) {
    console.error('Registration error:', error)
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

   
  <div class="bg-gray-100 flex items-center justify-center pt-6 pb-16 px-4">

    <Transition name="fade-slide" mode="out-in">

    <div v-if="!success" class="min-h-[60vh] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-50 to-slate-100">
  <div class="w-full max-w-4xl bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-8 md:p-12">
      <div class="flex justify-center mb-4">

              <img src="../public/logonew1.jpg" alt="Logo" class="mx-auto mb-4" />

                 </div>
    <!-- Heading -->
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-slate-900">Create your account</h2>
      <p class="text-sm text-slate-500 mt-1">It only takes a minute to get started</p>
    </div>

    <form @submit.prevent="submitForm" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Full Name -->
      <div class="md:col-span-1">
        <label class="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
            <!-- user icon -->
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 1114 0H3z"/></svg>
          </span>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Ahmed Al-Farsi"
            class="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5
                   text-slate-900 placeholder-slate-400 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            required
          />
        </div>
      </div>

      <!-- Username -->
      <div class="md:col-span-1">
        <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45V19c0 .35-.06.68-.17 1H23c.55 0 1-.45 1-1v-.5C24 14.17 19.33 13 16 13z"/></svg>
          </span>
          <input
            v-model="form.username"
            type="text"
            placeholder="your_username"
            @input="form.username = form.username.replace(/\s/g, '')"
            class="w-full rounded-lg border bg-white pl-10 pr-3 py-2.5
                   focus:outline-none focus:ring-2
                   text-slate-900 placeholder-slate-400 shadow-sm"
            :class="errors.username ? 'border-red-500 ring-red-400' : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'"
          />
        </div>
        <p v-if="errors.username" class="text-xs text-red-600 mt-1">{{ errors.username }}</p>
      </div>

      <!-- Email -->
      <div class="md:col-span-1">
        <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 6.34A2 2 0 014.6 5h10.8a2 2 0 011.67.94l-7.07 4.12a1.5 1.5 0 01-1.53 0L2.94 6.34z"/><path d="M18 8.12v5.38A2.5 2.5 0 0115.5 16h-11A2.5 2.5 0 012 13.5V8.12l6.34 3.7a3 3 0 002.98 0L18 8.12z"/></svg>
          </span>
          <input
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            @input="validateEmail"
            class="w-full rounded-lg border bg-white pl-10 pr-3 py-2.5
                   focus:outline-none focus:ring-2
                   text-slate-900 placeholder-slate-400 shadow-sm"
            :class="errors.email ? 'border-red-500 ring-red-400' : 'border-slate-300 focus:ring-teal-500 focus:border-teal-500'"
          />
        </div>
        <p v-if="errors.email" class="text-xs text-red-600 mt-1">{{ errors.email }}</p>
      </div>

      <!-- Password -->
      <div class="md:col-span-1">
        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z" clip-rule="evenodd"/></svg>
          </span>
          <input
            v-model="form.password"
            :type="showPass ? 'text' : 'password'"
            placeholder="Create a strong password"
            autocomplete="new-password"
            class="w-full rounded-lg border bg-white pl-10 pr-10 py-2.5
                   text-slate-900 placeholder-slate-400 shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 border-slate-300"
          />
          <button
            type="button"
            :aria-pressed="showPass"
            @click="togglePass"
            class="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
            title="Show/Hide password"
          >
            <svg v-if="!showPass" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

      <!-- Confirm Password -->
      <div class="md:col-span-1">
        <label class="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-slate-400">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z" clip-rule="evenodd"/></svg>
          </span>
          <input
            v-model="form.password_confirmation"
            :type="showPass2 ? 'text' : 'password'"
            placeholder="Re-enter password"
            autocomplete="new-password"
            class="w-full rounded-lg border bg-white pl-10 pr-10 py-2.5
                   text-slate-900 placeholder-slate-400 shadow-sm
                   focus:outline-none focus:ring-2
                   border-slate-300"
            :class="errors.password_confirmation ? 'focus:ring-red-400 focus:border-red-500' : 'focus:ring-teal-500 focus:border-teal-500'"
          />
          <button
            type="button"
            :aria-pressed="showPass2"
            @click="togglePass2"
            class="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
            title="Show/Hide password"
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
        <p v-if="errors.password_confirmation" class="text-xs text-red-600 mt-1">{{ errors.password_confirmation }}</p>
      </div>

      <!-- Submit -->
      <div class="md:col-span-2 pt-2">
        <button
          type="submit"
          :disabled="!isFormValid || isSubmitting"
          class="w-full inline-flex items-center justify-center rounded-lg
                 bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold
                 py-3 shadow-sm hover:opacity-95 disabled:opacity-60 transition"
        >
          <span v-if="isSubmitting" class="animate-spin inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
          Register
        </button>
        <p class="mt-3 text-center text-xs text-slate-500">
          Already have an account?
          <NuxtLink to="/login" class="font-medium text-cyan-700 hover:underline">Sign in</NuxtLink>
        </p>
      </div>
    </form>
  </div>
</div>

<!-- Success state -->
<div v-else class="text-center space-y-4 py-16">
  <h2 class="text-xl font-semibold text-green-600">🎉 Thank you for registering with us!</h2>
  <NuxtLink to="/" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700">
    Go to Home
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707A1 1 0 018.707 5.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
    </svg>
  </NuxtLink>
</div>

  
    </Transition>
  </div>

</section>

</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>



