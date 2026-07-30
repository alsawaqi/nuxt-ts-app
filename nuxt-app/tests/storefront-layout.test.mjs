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
