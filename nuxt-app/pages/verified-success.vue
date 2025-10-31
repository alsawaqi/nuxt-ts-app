<script setup lang="ts">
definePageMeta({
  layout: 'layouts',
  middleware: 'guest',
})
</script>

<template>
  <section class="bg-gray-100 min-h-[70vh] flex flex-col">

    <!-- banner / header image (reuse same banner style for consistency) -->
    <div class="w-full h-[220px] overflow-hidden">
      <img 
        src="../public/images/banners.jpg"
        alt="Banner"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- content card -->
    <div class="flex-1 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-8 text-center">

        <!-- success icon -->
        <div class="flex justify-center mb-4">
          <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl font-bold shadow-inner">
            ✓
          </div>
        </div>

        <h1 class="text-2xl font-bold text-slate-900">
          Your email has been verified
        </h1>

        <p class="text-sm text-slate-600 mt-2 leading-relaxed">
          Thank you for confirming your email. Your account is now active.
          You can sign in and start using your account.
        </p>

        <div class="mt-8 space-y-3">
          <NuxtLink
            to="/login"
            class="block w-full text-center rounded-lg bg-teal-600 text-white text-sm font-medium py-2.5 shadow-sm hover:bg-teal-700 transition"
          >
            Go to Login
          </NuxtLink>

          <NuxtLink
            to="/"
            class="block w-full text-center rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium py-2.5 shadow-sm hover:bg-slate-50 transition"
          >
            Back to Home
          </NuxtLink>
        </div>

        <p class="text-[11px] text-slate-500 mt-6">
          If you didn't request this verification, please contact support.
        </p>
      </div>
    </div>

  </section>
</template>
