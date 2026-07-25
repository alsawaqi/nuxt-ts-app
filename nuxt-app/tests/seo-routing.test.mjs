import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canonicalRedirectLocation,
  firstForwardedValue,
  normalizeRedirectPathname,
} from '../utils/seoRouting.js'

test('forwarded headers use the original client-facing value', () => {
  assert.equal(firstForwardedValue('https, http'), 'https')
  assert.equal(firstForwardedValue('avinaq.com, internal-proxy'), 'avinaq.com')
  assert.equal(firstForwardedValue(undefined), '')
})

test('redirect pathname normalization keeps root and removes duplicate or trailing slashes', () => {
  assert.equal(normalizeRedirectPathname('/'), '/')
  assert.equal(normalizeRedirectPathname('/product/motor/'), '/product/motor')
  assert.equal(normalizeRedirectPathname('//departments//motors///'), '/departments/motors')
})

test('canonical redirect upgrades scheme, replaces host, removes trailing slash, and keeps query', () => {
  assert.equal(
    canonicalRedirectLocation({
      method: 'GET',
      siteUrl: 'https://avinaq.com/',
      requestHost: 'www.avinaq.com',
      requestProtocol: 'http',
      pathname: '/product/motor/',
      search: '?utm_source=test',
    }),
    'https://avinaq.com/product/motor?utm_source=test'
  )
})

test('canonical requests and mutation methods are not redirected', () => {
  assert.equal(
    canonicalRedirectLocation({
      method: 'HEAD',
      siteUrl: 'https://avinaq.com',
      requestHost: 'avinaq.com:443',
      requestProtocol: 'https',
      pathname: '/product/motor',
    }),
    null
  )

  assert.equal(
    canonicalRedirectLocation({
      method: 'POST',
      siteUrl: 'https://avinaq.com',
      requestHost: 'www.avinaq.com',
      requestProtocol: 'http',
      pathname: '/cart/checkout/',
    }),
    null
  )
})

test('canonical redirects are disabled when the configured site URL is invalid', () => {
  assert.equal(
    canonicalRedirectLocation({
      method: 'GET',
      siteUrl: '',
      requestHost: 'example.test',
      requestProtocol: 'http',
      pathname: '/path/',
    }),
    null
  )
})
