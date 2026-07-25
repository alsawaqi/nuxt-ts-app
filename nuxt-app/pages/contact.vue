<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  alias: ['/ar/contact'],
})

import { ref } from 'vue'
import { assetUrl, canonicalUrl, localizedAlternateLinks, openGraphLocale, organizationJsonLd, seoTitle, webPageJsonLd } from '~/utils/storefrontSeo.js'

const config = useRuntimeConfig()
const { locale, localePath } = useStorefrontLocale()
const siteUrl = computed(() => String(config.public.siteUrl || ''))
const contactCopy = computed(() => locale.value === 'ar'
  ? {
      title: 'تواصل مع مركز المستلزمات الصناعية',
      description: 'تواصل مع فريق مركز المستلزمات الصناعية للاستفسار عن المنتجات والطلبات والشراكات في سلطنة عُمان.',
      eyebrow: 'تواصل معنا',
    }
  : {
      title: 'Contact Industrial Supplies Center',
      description: 'Contact Industrial Supplies Center for help with industrial products, orders and partnerships in Oman.',
      eyebrow: 'Get in touch',
    })

useHead(() => {
  const canonical = canonicalUrl(siteUrl.value, localePath('/contact'))
  const image = assetUrl(siteUrl.value, '/logonew1.jpg')
  const title = seoTitle(contactCopy.value.title)

  return {
    title,
    meta: [
      { name: 'description', content: contactCopy.value.description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: contactCopy.value.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'ISC Depot' },
      { property: 'og:locale', content: openGraphLocale(locale.value) },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: contactCopy.value.description },
      { name: 'twitter:image', content: image },
    ],
    link: [
      { rel: 'canonical', href: canonical },
      ...localizedAlternateLinks(siteUrl.value, '/contact'),
    ],
    script: [
      {
        key: 'contact-organization-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(organizationJsonLd({
          siteUrl: siteUrl.value,
          email: 'motorsales@isc-depot.com',
          telephone: '+96824460320',
        })),
      },
      {
        key: 'contact-page-jsonld',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(webPageJsonLd({
          siteUrl: siteUrl.value,
          path: localePath('/contact'),
          name: contactCopy.value.title,
          description: contactCopy.value.description,
          locale: locale.value,
          type: 'ContactPage',
        })),
      },
    ],
  }
})

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
    <section class="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div class="max-w-screen-xl mx-auto px-6 pt-24 pb-12 lg:pt-28">
        <div class="grid lg:grid-cols-2 gap-10 items-start">
          <!-- LEFT -->
          <div>
            <span class="inline-flex items-center gap-2 text-xs font-medium text-sky-700 bg-sky-50 ring-1 ring-sky-100 px-2.5 py-1 rounded-full">
              <span>✉️</span> {{ contactCopy.eyebrow }}
            </span>
            <h1 class="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              {{ contactCopy.title }}
            </h1>
            <p class="mt-3 text-slate-600 max-w-prose">
              {{ contactCopy.description }}
            </p>

            <!-- Quick actions -->
            <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a href="tel:+96824460320" class="group flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white p-3 hover:shadow-sm transition">
                <div class="h-9 w-9 grid place-items-center rounded-lg bg-sky-50 ring-1 ring-sky-100">
                  <svg class="h-5 w-5 text-sky-600" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h2.5a1 1 0 011 1c0 1.23.2 2.43.57 3.56a1 1 0 01-.25 1.02l-2.2 2.21z"/></svg>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide text-slate-500">Call</div>
                  <div class="font-semibold text-slate-900">+968 2446 0320</div>
                </div>
              </a>

              <a href="mailto:motorsales@isc-depot.com" class="group flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white p-3 hover:shadow-sm transition">
                <div class="h-9 w-9 grid place-items-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
                  <svg class="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 6.34A2 2 0 014.6 5h10.8a2 2 0 011.67.94l-7.07 4.12a1.5 1.5 0 01-1.53 0L2.94 6.34z"/><path d="M18 8.12v5.38A2.5 2.5 0 0115.5 16h-11A2.5 2.5 0 012 13.5V8.12l6.34 3.7a3 3 0 002.98 0L18 8.12z"/></svg>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide text-slate-500">Email</div>
                  <div class="font-semibold text-slate-900">motorsales@isc-depot.com</div>
                </div>
              </a>

              <div class="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white p-3">
                <div class="h-9 w-9 grid place-items-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
                  <svg class="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v2H6zM4 6h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 3v2h8V9H8z"/></svg>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wide text-slate-500">Mobile</div>
                  <div class="font-semibold text-slate-900">+968 9321 9447</div>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Form card -->
<div class="relative">
  <div
    class="isolate rounded-2xl bg-white/98 supports-[backdrop-filter]:bg-white/90 backdrop-blur
           ring-1 ring-slate-200 shadow-lg p-5 sm:p-7 antialiased"
  >
    <h2 class="text-xl font-bold text-slate-900">Send us a message</h2>
    <p class="text-slate-600 text-sm mt-1">We usually reply within 24 hours.</p>

    <form class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4" @submit.prevent="submit">
      <!-- Name -->
      <div>
        <label class="block text-xs font-semibold text-slate-800 mb-1">Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="Your name"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
                 text-[15px] text-slate-900 placeholder-slate-400 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      <!-- Email -->
      <div>
        <label class="block text-xs font-semibold text-slate-800 mb-1">Email</label>
        <input
          v-model="form.email"
          type="email"
          placeholder="you@email.com"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
                 text-[15px] text-slate-900 placeholder-slate-400 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="block text-xs font-semibold text-slate-800 mb-1">Phone (optional)</label>
        <input
          v-model="form.phone"
          type="tel"
          placeholder="+968…"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
                 text-[15px] text-slate-900 placeholder-slate-400 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      <!-- Subject -->
      <div>
        <label class="block text-xs font-semibold text-slate-800 mb-1">Subject</label>
        <input
          v-model="form.subject"
          type="text"
          placeholder="How can we help?"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
                 text-[15px] text-slate-900 placeholder-slate-400 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>

      <!-- Message -->
      <div class="sm:col-span-2">
        <label class="block text-xs font-semibold text-slate-800 mb-1">Message</label>
        <textarea
          v-model="form.message"
          rows="5"
          placeholder="Your message…"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
                 text-[15px] text-slate-900 placeholder-slate-400 shadow-sm resize-y
                 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        ></textarea>
      </div>

      <!-- Agree -->
      <label
        class="sm:col-span-2 inline-flex items-center gap-2 text-xs text-slate-700 select-none"
      >
        <input
          id="agree"
          v-model="form.agree"
          type="checkbox"
          class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        I agree to the privacy notice.
      </label>

      <!-- Submit -->
      <div class="sm:col-span-2">
        <div
          v-if="error"
          class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="sending || sent"
          class="w-full inline-flex items-center justify-center rounded-lg
                 bg-[#2f5fb6] hover:bg-[#274f97] text-white font-semibold py-2.5
                 shadow-sm transition disabled:opacity-60"
        >
          <svg
            v-if="sending"
            class="animate-spin h-5 w-5 mr-2"
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
          <span>{{ sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send message' }}</span>
        </button>
      </div>
    </form>
  </div>

  <!-- Subtle floating badge (kept small & clear) -->
  <div
    class="absolute -top-3 -right-3 rounded-full bg-emerald-500 text-white text-xs px-3 py-1 shadow"
  >
    24h Reply
  </div>
</div>

        </div>
      </div>
    </section>

    <!-- MAP + INFO -->
    <section class="bg-white">
      <div class="max-w-screen-xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-8">
        <div class="rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow">
          <iframe
            title="ISC Location"
            class="w-full h-[320px] sm:h-[360px]"
            loading="lazy"
            src="https://maps.google.com/maps?q=Muscat%20Oman&t=&z=12&ie=UTF8&iwloc=&output=embed"
          ></iframe>
        </div>

        <div class="grid sm:grid-cols-2 gap-6">
          <div class="info-card">
            <h3 class="info-title">Head Office</h3>
            <p class="info-body">Al Mahbeela, Muscat, Oman</p>
          </div>
          <div class="info-card">
            <h3 class="info-title">Sales</h3>
            <p class="info-body">motorsales@isc-depot.com<br/>+968 2446 0320</p>
          </div>
          <div class="info-card">
            <h3 class="info-title">Support</h3>
            <p class="info-body">motorsales@isc-depot.com<br/>+968 9321 9447</p>
          </div>
          <div class="info-card">
            <h3 class="info-title">WhatsApp</h3>
            <p class="info-body"><a href="https://wa.me/96893219447" rel="noopener" class="hover:text-cyan-700">+968 9321 9447</a></p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-slate-50">
      <div class="max-w-screen-xl mx-auto px-6 py-12">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center">Frequently Asked Questions</h2>
        <div class="mt-6 mx-auto max-w-3xl space-y-3">
          <details class="faq">
            <summary>How fast do you respond?</summary>
            <p>We aim to reply within 24 hours on business days.</p>
          </details>
          <details class="faq">
            <summary>Do you ship internationally?</summary>
            <p>Yes, we work with multiple carriers for international shipments.</p>
          </details>
          <details class="faq">
            <summary>Can I request a quotation?</summary>
            <p>Absolutely—use the form above or email motorsales@isc-depot.com with item codes and quantities.</p>
          </details>
        </div>
      </div>
    </section>
  </div>
</template>
 
 
