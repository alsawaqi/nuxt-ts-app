import test from 'node:test'
import assert from 'node:assert/strict'

import {
  breadcrumbJsonLd,
  canonicalUrl,
  collectionPageJsonLd,
  isLocalizedPublicPath,
  isNoIndexPath,
  localeFromPath,
  localizedAlternateLinks,
  localizedPath,
  normalizePathname,
  organizationJsonLd,
  productJsonLd,
  sitemapXml,
  webPageJsonLd,
  websiteJsonLd,
} from '../utils/storefrontSeo.js'

test('canonical URLs are absolute, query-free, and slash-normalized', () => {
  assert.equal(
    canonicalUrl('https://shop.example.com/', '/product/safety-glove/?utm_source=test'),
    'https://shop.example.com/product/safety-glove'
  )
  assert.equal(canonicalUrl('https://shop.example.com/', '/'), 'https://shop.example.com/')
  assert.equal(normalizePathname('//departments//cutting-tools///'), '/departments/cutting-tools')
  assert.equal(canonicalUrl('', '/departments/cutting-tools'), '/departments/cutting-tools')
})

test('localized paths and reciprocal alternates use deterministic English and Arabic URLs', () => {
  assert.equal(localeFromPath('/product/motor'), 'en')
  assert.equal(localeFromPath('/ar/product/motor'), 'ar')
  assert.equal(localizedPath('/product/motor?ref=1#details', 'ar'), '/ar/product/motor?ref=1#details')
  assert.equal(localizedPath('/ar/product/motor', 'en'), '/product/motor')
  assert.equal(localizedPath('/', 'ar'), '/ar')
  assert.equal(isLocalizedPublicPath('/ar/policies/privacy'), true)
  assert.equal(isLocalizedPublicPath('/ar/cart'), false)

  assert.deepEqual(
    localizedAlternateLinks('https://shop.example.com', '/ar/product/motor'),
    [
      { rel: 'alternate', hreflang: 'en-OM', href: 'https://shop.example.com/product/motor' },
      { rel: 'alternate', hreflang: 'ar-OM', href: 'https://shop.example.com/ar/product/motor' },
      { rel: 'alternate', hreflang: 'x-default', href: 'https://shop.example.com/product/motor' },
    ]
  )
})

test('private and transactional routes are marked non-indexable', () => {
  for (const path of [
    '/account',
    '/account/orders',
    '/cart',
    '/cart/checkout',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/already-verified',
    '/verified-success',
    '/verify-error',
  ]) {
    assert.equal(isNoIndexPath(path), true, path)
  }

  assert.equal(isNoIndexPath('/product/motor'), false)
  assert.equal(isNoIndexPath('/policies/privacy'), false)
})

test('product JSON-LD exposes offer, stock, images, rating, and omits an empty SKU', () => {
  const data = productJsonLd({
    product: {
      Product_Name: 'Safety Glove',
      Product_Description: 'Cut resistant glove',
      Slug: 'safety-glove',
      Product_Final_Price: '2.500',
      Product_Stock: 4,
      images: [{ Image_Path: 'products/glove.jpg' }],
    },
    reviewSummary: { average_rating: '4.60', review_count: 8 },
    siteUrl: 'https://shop.example.com',
    r2Url: 'https://cdn.example.com',
  })

  assert.equal(data['@type'], 'Product')
  assert.equal(data.name, 'Safety Glove')
  assert.equal(data.url, 'https://shop.example.com/product/safety-glove')
  assert.equal(data.image[0], 'https://cdn.example.com/products/glove.jpg')
  assert.equal(data.offers.availability, 'https://schema.org/InStock')
  assert.equal(data.offers.price, '2.500')
  assert.equal('sku' in data, false)
  assert.deepEqual(data.aggregateRating, {
    '@type': 'AggregateRating',
    ratingValue: '4.60',
    reviewCount: 8,
  })
})

test('breadcrumb JSON-LD creates ordered list items with canonical item URLs', () => {
  const data = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Cutting Tools', path: '/departments/cutting-tools' },
  ], 'https://shop.example.com/')

  assert.equal(data['@type'], 'BreadcrumbList')
  assert.deepEqual(data.itemListElement.map((item) => item.position), [1, 2])
  assert.equal(data.itemListElement[1].item, 'https://shop.example.com/departments/cutting-tools')
})

test('business, website, page, and collection structured data use canonical URLs', () => {
  const organization = organizationJsonLd({ siteUrl: 'https://shop.example.com/' })
  const website = websiteJsonLd({ siteUrl: 'https://shop.example.com/' })
  const page = webPageJsonLd({
    siteUrl: 'https://shop.example.com',
    path: '/contact/',
    name: 'Contact',
    description: 'Contact our team.',
  })
  const collection = collectionPageJsonLd({
    siteUrl: 'https://shop.example.com',
    path: '/departments/motors',
    name: 'Motors',
    products: [{ name: 'Motor A', slug: 'motor-a', image: { Image_Path: 'motor.jpg' } }],
    r2Url: 'https://cdn.example.com',
  })

  assert.equal(organization['@id'], 'https://shop.example.com/#organization')
  assert.equal(website.publisher['@id'], organization['@id'])
  assert.equal(page.url, 'https://shop.example.com/contact')
  assert.equal(collection.mainEntity.numberOfItems, 1)
  assert.equal(collection.mainEntity.itemListElement[0].url, 'https://shop.example.com/product/motor-a')
})

test('sitemap XML escapes URLs and keeps useful metadata', () => {
  const xml = sitemapXml([
    { loc: 'https://shop.example.com/product/a&b', lastmod: '2026-07-25', changefreq: 'weekly', priority: 0.8 },
  ])

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/)
  assert.match(xml, /<loc>https:\/\/shop.example.com\/product\/a&amp;b<\/loc>/)
  assert.match(xml, /<lastmod>2026-07-25<\/lastmod>/)
  assert.match(xml, /<changefreq>weekly<\/changefreq>/)
  assert.match(xml, /<priority>0.8<\/priority>/)
})
