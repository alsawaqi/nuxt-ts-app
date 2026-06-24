import test from 'node:test'
import assert from 'node:assert/strict'

import {
  breadcrumbJsonLd,
  canonicalUrl,
  productJsonLd,
  sitemapXml,
} from '../utils/storefrontSeo.js'

test('canonical URLs are absolute, normalized, and query-free', () => {
  assert.equal(
    canonicalUrl('https://shop.example.com/', '/product/safety-glove?utm_source=test'),
    'https://shop.example.com/product/safety-glove'
  )

  assert.equal(
    canonicalUrl('', '/departments/cutting-tools'),
    '/departments/cutting-tools'
  )
})

test('product JSON-LD exposes offer, stock availability, and aggregate rating', () => {
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
  assert.equal(data.image[0], 'https://cdn.example.com/products/glove.jpg')
  assert.equal(data.offers.availability, 'https://schema.org/InStock')
  assert.equal(data.offers.price, '2.500')
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

test('sitemap XML escapes URLs and keeps useful metadata', () => {
  const xml = sitemapXml([
    { loc: 'https://shop.example.com/product/a&b', changefreq: 'weekly', priority: 0.8 },
  ])

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/)
  assert.match(xml, /<loc>https:\/\/shop.example.com\/product\/a&amp;b<\/loc>/)
  assert.match(xml, /<changefreq>weekly<\/changefreq>/)
  assert.match(xml, /<priority>0.8<\/priority>/)
})
