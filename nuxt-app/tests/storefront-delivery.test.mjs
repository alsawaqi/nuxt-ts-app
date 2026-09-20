import test from 'node:test'
import assert from 'node:assert/strict'
import { localImageSource, hasSessionCookie } from '../utils/storefrontDelivery.js'

test('uploaded images use the local read-only mount without permitting other origins', () => {
  const base = 'https://app.avinaq.com/storage'
  assert.equal(localImageSource(base + '/department/a b.jpg', base), '/catalog/department/a%20b.jpg')
  assert.equal(localImageSource('/images/banners.jpg', base), '/images/banners.jpg')
  assert.equal(localImageSource('https://app.avinaq.com.evil.test/storage/a.jpg', base), '')
  assert.equal(localImageSource('https://app.avinaq.com/private/a.jpg', base), '')
  assert.equal(localImageSource(base + '/%2e%2e/private.jpg', base), '')
  assert.equal(localImageSource(base + '/%2e%2e%2fprivate.jpg', base), '')
  assert.equal(localImageSource(null, base), '')
})

test('only an actual session cookie requires server-side authentication', () => {
  for (const value of ['', 'theme=dark', 'not_token=abc', 'token=', 'XSRF-TOKEN=abc']) assert.equal(hasSessionCookie(value), false)
  for (const value of ['token=abc', 'theme=dark; refresh_token=abc', 'token=expired; refresh_token=valid']) assert.equal(hasSessionCookie(value), true)
})
