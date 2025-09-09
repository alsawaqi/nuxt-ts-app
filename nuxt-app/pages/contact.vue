<script setup lang="ts">
definePageMeta({ layout: 'layouts' })

import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  agree: false,
})
const sending = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

const validate = () => {
  error.value = null
  if (!form.value.name.trim()) return (error.value = 'Please enter your name.')
  if (!/^\S+@\S+\.\S+$/.test(form.value.email)) return (error.value = 'Please enter a valid email.')
  if (!form.value.subject.trim()) return (error.value = 'Please add a subject.')
  if (!form.value.message.trim()) return (error.value = 'Please write a message.')
  if (!form.value.agree) return (error.value = 'Please accept the privacy notice.')
  return null
}

const submit = async () => {
  if (validate()) return
  sending.value = true
  try {
    // await $axios.post('/api/contact', form.value)
    await new Promise(r => setTimeout(r, 900)) // demo
    sent.value = true
  } catch (e:any) {
    error.value = e?.message || 'Failed to send message.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="relative">
    <!-- HERO -->

 
<section class="relative overflow-hidden pt-28 lg:pt-32">
  <!-- BG image -->
  <div
    class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
    style="background-image:url('/images/contact-hero.jpg')"
    aria-hidden="true"
  ></div>
      <div class="absolute inset-0 z-10 bg-gradient-to-br from-cyan-600/80 via-teal-600/75 to-emerald-600/75"></div>

      <!-- ambient blobs -->
      <div class="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-pulse -z-10"></div>
  <div class="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-black/10 blur-3xl animate-[pulse_5s_ease-in-out_infinite] -z-10"></div>

      <div class="max-w-screen-xl mx-auto px-6 pb-16 lg:pb-24">
        <div class="grid lg:grid-cols-2 gap-10 items-center">
          <!-- LEFT (text stays white) -->
          <div class="text-white">
            <p class="uppercase tracking-widest   text-xs mb-3">we’d love to hear from you</p>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Contact
              <span class="inline-block bg-white/15 px-2 py-0.5 rounded-lg">Industrial Supplies Center</span>
            </h1>
            <p class="mt-4  max-w-prose">
              Questions about products, orders, or partnerships? Our team is here to help.
              Reach out and we’ll get back to you shortly.
            </p>

            <!-- Quick contacts -->
            <div class="mt-8 grid sm:grid-cols-3 gap-4">
              <div class="group rounded-2xl bg-white/10 backdrop-blur p-4 ring-1 ring-white/20 hover:ring-white/40 transition transform hover:-translate-y-0.5">
                <div class="text-sm opacity-80">Call</div>
                <div class="font-semibold">+968 0000 0000</div>
              </div>
              <div class="group rounded-2xl bg-white/10 backdrop-blur p-4 ring-1 ring-white/20 hover:ring-white/40 transition transform hover:-translate-y-0.5">
                <div class="text-sm opacity-80">Email</div>
                <div class="font-semibold">support@isc-depot.com</div>
              </div>
              <div class="group rounded-2xl bg-white/10 backdrop-blur p-4 ring-1 ring-white/20 hover:ring-white/40 transition transform hover:-translate-y-0.5">
                <div class="text-sm opacity-80">Hours</div>
                <div class="font-semibold">Sun–Thu, 9:00–18:00</div>
              </div>
            </div>
          </div>

          <!-- RIGHT (card uses dark text) -->
          <div class="relative">
            <div class="relative z-10 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/70 p-6 sm:p-8 animate-[fadeInUp_.6s_ease-out] text-slate-800">
              <h2 class="text-xl font-bold text-slate-800">Send us a message</h2>
              <p class="text-slate-500 text-sm mt-1">We typically respond within 1–2 business days.</p>

              <form class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="submit">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                  <input v-model="form.name" type="text" class="input" placeholder="Your name" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input v-model="form.email" type="email" class="input" placeholder="you@email.com" />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Phone (optional)</label>
                  <input v-model="form.phone" type="tel" class="input" placeholder="+968…" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
                  <input v-model="form.subject" type="text" class="input" placeholder="How can we help?" />
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Message</label>
                  <textarea v-model="form.message" rows="5" class="input resize-y" placeholder="Your message…"></textarea>
                </div>

                <div class="sm:col-span-2 flex items-center gap-2 text-xs text-slate-600">
                  <input id="agree" v-model="form.agree" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                  <label for="agree">I agree to the privacy notice.</label>
                </div>

                <div class="sm:col-span-2">
                  <div v-if="error" class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {{ error }}
                  </div>
                  <button
                    type="submit"
                    :disabled="sending || sent"
                    class="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600  font-semibold py-2.5 shadow hover:opacity-95 disabled:opacity-60 transition"
                  >
                    <svg v-if="sending" class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>{{ sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send message' }}</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- floating badge -->
             <div class="absolute -top-4 -right-4 rounded-full bg-emerald-500 text-white text-xs px-3 py-1 shadow-lg animate-bounce z-20">
              <span class="font-semibold">24h Reply</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- MAP + INFO -->
    <section class="bg-white">
      <div class="max-w-screen-xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-8">
        <div class="rounded-3xl overflow-hidden shadow-xl ring-1 ring-slate-200">
          <iframe
            title="ISC Location"
            class="w-full h-[360px]"
            loading="lazy"
            src="https://maps.google.com/maps?q=Muscat%20Oman&t=&z=12&ie=UTF8&iwloc=&output=embed"
          ></iframe>
        </div>

        <div class="grid sm:grid-cols-2 gap-6">
          <div class="card">
            <h3 class="card-title">Head Office</h3>
            <p class="card-body">Al Qurum, Muscat, Oman<br/>PO Box 1234</p>
          </div>
          <div class="card">
            <h3 class="card-title">Sales</h3>
            <p class="card-body">sales@isc-depot.com<br/>+968 0000 0001</p>
          </div>
          <div class="card">
            <h3 class="card-title">Support</h3>
            <p class="card-body">support@isc-depot.com<br/>+968 0000 0002</p>
          </div>
          <div class="card">
            <h3 class="card-title">WhatsApp</h3>
            <p class="card-body">+968 0000 0003</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-slate-50">
      <div class="max-w-screen-xl mx-auto px-6 py-14">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Frequently Asked Questions</h2>
        <div class="mt-8 mx-auto max-w-3xl space-y-3">
          <details class="accordion">
            <summary class="accordion-summary">How fast do you respond?</summary>
            <div class="accordion-panel">
              We aim to reply within 24 hours on business days.
            </div>
          </details>
          <details class="accordion">
            <summary class="accordion-summary">Do you ship internationally?</summary>
            <div class="accordion-panel">
              Yes, we work with multiple carriers for international shipments.
            </div>
          </details>
          <details class="accordion">
            <summary class="accordion-summary">Can I request a quotation?</summary>
            <div class="accordion-panel">
              Absolutely—use the form above or email sales@isc-depot.com with item codes and quantities.
            </div>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="postcss">
 
</style>
