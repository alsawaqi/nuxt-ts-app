import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('shared layouts keep routed content in a stable flex item before the footer', async () => {
  for (const path of ['layouts/layout.vue', 'layouts/layouts.vue']) {
    const layout = await source(path)

    assert.match(layout, /min-h-screen flex flex-col/)
    assert.match(layout, /<div class="flex-1">\s*<slot\s*\/>\s*<\/div>\s*<Footer\s*\/>/)
  }
})

test('storefront grid track lists use Tailwind arbitrary-value spaces', async () => {
  const expectations = new Map([
    ['layouts/inc/header.vue', ['grid-cols-[auto_1fr_auto]', 'md:grid-cols-[1fr_auto_1fr]']],
    ['pages/index.vue', ['grid-cols-[auto_1fr_auto]', 'lg:grid-cols-[minmax(280px,420px)_1fr]']],
    ['components/account/AccountAddresses.vue', ['grid-cols-[120px_1fr]']],
    ['components/account/AccountProfile.vue', ['grid-cols-[120px_1fr]']],
    ['components/account/AccountOrders.vue', ['lg:grid-cols-[minmax(0,1fr)_320px]']],
    ['pages/cart/index.vue', ['grid-cols-[64px_1fr_auto]', 'sm:grid-cols-[84px_1fr_auto]', 'grid-cols-[120px_1fr]']],
  ])

  for (const [path, classNames] of expectations) {
    const contents = await source(path)

    for (const className of classNames) {
      assert.ok(contents.includes(className), `${path} must contain ${className}`)
    }
  }
})

test('storefront headers keep a compact responsive height contract', async () => {
  for (const path of ['layouts/inc/header.vue', 'pages/index.vue']) {
    const contents = await source(path)
    const header = contents.match(/<header\b[\s\S]*?<\/header>/)?.[0]

    assert.ok(header, `${path} must contain the storefront header`)
    assert.ok(header.includes('h-8 px-3 sm:px-5'), `${path} must keep the utility bar compact`)
    assert.ok(header.includes('lg:gap-4 py-2'), `${path} must keep the main row compact`)
    assert.ok(header.includes('h-9 w-auto object-contain sm:h-10 md:h-10 lg:h-11'), `${path} must use the compact responsive logo scale`)
    assert.ok(header.includes('mt-1 text-[13px] sm:text-sm'), `${path} must use the compact business name scale`)
    assert.ok(header.includes('h-1 bg-[#2f5fb6]'), `${path} must use the slim brand divider`)
    assert.ok(header.includes('md:px-6 py-2'), `${path} must keep the search row compact`)
    assert.doesNotMatch(header, /lg:h-16/)
    assert.doesNotMatch(header, /sm:py-4/)
    assert.doesNotMatch(header, /hidden md:inline-flex inline-flex/)
  }
})

test('Tailwind 4 keeps the storefront legacy cursor and border defaults', async () => {
  const css = await source('assets/css/storefront-rtl.css')

  assert.match(css, /border-color:\s*var\(--color-gray-200,\s*#e5e7eb\)/)
  assert.match(css, /button:not\(:disabled\)/)
  assert.match(css, /\[role='link'\]/)
  assert.match(css, /button:disabled/)
})

test('cart quantity writes remain optimistic while checkout waits for confirmation', async () => {
  const cartStore = await source('stores/cart.ts')
  const cartPage = await source('pages/cart/index.vue')

  const optimisticUpdate = cartStore.indexOf('existing.quantity = quantity')
  const queuedWrite = cartStore.indexOf('quantityQueue.enqueue(offerKey(product), quantity, confirmedQuantity)')

  assert.ok(optimisticUpdate >= 0)
  assert.ok(queuedWrite > optimisticUpdate)
  assert.match(cartPage, /cartActionBlocked = computed\(\(\) => cartMutationInFlight\.value \|\| cart\.quantitySyncPending\)/)
  assert.match(cartPage, /cart\.quantitySyncPending \? t\('cart\.updatingCart'\)/)
})
