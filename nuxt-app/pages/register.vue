<script setup lang="ts">
  definePageMeta({
    layout: 'layouts',
    middleware: 'guest',
  })
import { ref ,watch, computed} from 'vue'
import { useUserStore } from '~/stores/user'

const { $axios } = useNuxtApp()
 
const userStore = useUserStore()
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
      // SSR-safe token storage
      const cookie = useCookie('token', { maxAge: 60 * 60 * 24 * 7 }) // 7 days
      cookie.value = token

      // Set user in Pinia store
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
      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRPL_9IEteEZqaBS3X5CSoBfG7_-RbLiaN6Q&s" 
      alt="Banner" 
      class="w-full h-full object-cover"
    />
  </div>

   
  <div class="bg-gray-100 flex items-center justify-center pt-6 pb-16 px-4">

    <Transition name="fade-slide" mode="out-in">

    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-12 border border-gray-300" v-if="!success">

      <h2 class="text-3xl font-bold text-center text-gray-800 mb-6">Create Your Account</h2>

      <form @submit.prevent="submitForm" class="space-y-6">
        <!-- Name -->
        <div>
          <label class="block text-gray-700 font-medium mb-1">Full Name</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Enter your full name"
            required
          />
        </div>



          <!-- Name -->
       <div>
  <label class="block text-gray-700 font-medium mb-1">User Name</label>
  <input
    v-model="form.username"
    type="text"
    class="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
    :class="errors.username ? 'border-red-500 ring-red-400' : 'border-gray-300 focus:ring-green-400'"
    placeholder="Choose a username"
    @input="form.username = form.username.replace(/\s/g, '')"
  />
  <p v-if="errors.username" class="text-sm text-red-500 mt-1">{{ errors.username }}</p>
</div>

        <!-- Email -->
<div>
  <label class="block text-gray-700 font-medium mb-1">Email</label>
  <input
    v-model="form.email"
    type="email"
    class="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
    :class="errors.email ? 'border-red-500 ring-red-400' : 'border-gray-300 focus:ring-green-400'"
    placeholder="Enter your email"
    @input="validateEmail"
  />
  <p v-if="errors.email" class="text-sm text-red-500 mt-1">{{ errors.email }}</p>
</div>
        

        <!-- Password -->
        <div>
          <label class="block text-gray-700 font-medium mb-1">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Create a password"
          />
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-gray-700 font-medium mb-1">Confirm Password</label>
          <input
            v-model="form.password_confirmation"
            type="password"
            class="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
            :class="errors.password_confirmation ? 'border-red-500 ring-red-400' : 'border-gray-300 focus:ring-green-400'"
            placeholder="Confirm your password"
          />
          <p v-if="errors.password_confirmation" class="text-sm text-red-500 mt-1">{{ errors.password_confirmation }}</p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="!isFormValid"
          class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl shadow transition"
          
        >

        <span 
  v-if="isSubmitting" 
  class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
></span>
          
          Register
        </button>
      </form>
    </div>


    <div class="text-center space-y-4" v-else>
      <h2 class="text-xl font-semibold text-green-600">🎉 Thank you for registering with us!</h2><br>
      <NuxtLink to="/" class="bg-blue-600 text-white px-4 py-2 rounded">Go to Home</NuxtLink>
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



