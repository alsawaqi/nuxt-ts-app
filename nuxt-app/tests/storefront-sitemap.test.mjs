import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildLocalizedSitemapEntries,
  isSeoSitemapPayload,
  localizedSitemapXml,
  normalizeSitemapLastmod,
} from '../utils/storefrontSitemap.js'

test('flattened SEO payload validation requires both collections', () => {
  assert.equal(isSeoSitemapPayload({ categories: [], products: [] }), true)
  assert.equal(isSeoSitemapPayload({ categories: [] }), false)
  assert.equal(isSeoSitemapPayload(null), false)
})

test('real last-modified values are normalized and absent values are omitted', () => {
  assert.equal(normalizeSitemapLastmod('2026-07-24'), '2026-07-24')
  assert.equal(
    normalizeSitemapLastmod('2026-07-24T12:34:56+04:00'),
    '2026-07-24T08:34:56.000Z'
  )
  assert.equal(normalizeSitemapLastmod(null), undefined)
  assert.equal(normalizeSitemapLastmod('not-a-date'), undefined)
})

test('sitemap entries contain reciprocal English, Arabic, and default alternates', () => {
  const entries = buildLocalizedSitemapEntries({
    siteUrl: 'https://shop.example.com/',
    categories: [{ slug: 'power-tools', updated_at: null }],
    products: [{ slug: 'safety-glove', updated_at: '2026-07-24T12:34:56+04:00' }],
  })

  const englishProduct = entries.find((entry) => entry.loc === 'https://shop.example.com/product/safety-glove')
  const arabicProduct = entries.find((entry) => entry.loc === 'https://shop.example.com/ar/product/safety-glove')
  const englishCategory = entries.find((entry) => entry.loc === 'https://shop.example.com/departments/power-tools')

  assert.ok(englishProduct)
  assert.ok(arabicProduct)
  assert.ok(englishCategory)
  assert.equal(englishProduct.lastmod, '2026-07-24T08:34:56.000Z')
  assert.equal(englishCategory.lastmod, undefined)
  assert.deepEqual(englishProduct.alternates, arabicProduct.alternates)
  assert.deepEqual(englishProduct.alternates, [
    {
      hreflang: 'en-OM',
      href: 'https://shop.example.com/product/safety-glove',
    },
    {
      hreflang: 'ar-OM',
      href: 'https://shop.example.com/ar/product/safety-glove',
    },
    {
      hreflang: 'x-default',
      href: 'https://shop.example.com/product/safety-glove',
    },
  ])
})

test('localized sitemap XML declares xhtml and does not invent lastmod dates', () => {
  const entries = buildLocalizedSitemapEntries({
    siteUrl: 'https://shop.example.com',
    categories: [{ slug: 'motors', updated_at: null }],
    products: [],
  })
  const xml = localizedSitemapXml(entries)

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/)
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/)
  assert.match(xml, /<loc>https:\/\/shop\.example\.com\/ar\/departments\/motors<\/loc>/)
  assert.match(xml, /hreflang="en-OM"/)
  assert.match(xml, /hreflang="ar-OM"/)
  assert.match(xml, /hreflang="x-default"/)
  assert.doesNotMatch(xml, /<lastmod>/)
})

test('sitemap generation rejects relative site URLs', () => {
  assert.throws(
    () => buildLocalizedSitemapEntries({ siteUrl: '/store', categories: [], products: [] }),
    /absolute site URL/
  )
})
