import test from 'node:test'
import assert from 'node:assert/strict'

import {
  filterAndSortProducts,
  productSearchText,
  updateRecentlyViewed,
} from '../utils/discovery.js'

const rows = [
  {
    id: 1,
    Product_Name: 'Abrasive Disc',
    final_price: 4,
    Product_Stock: 0,
    has_discount: true,
    review_summary: { average_rating: '4.7', review_count: 11 },
    specs: { 9: { label: '100 mm' } },
  },
  {
    id: 2,
    Product_Name: 'Safety Glove',
    Product_Name_Ar: 'قفاز سلامة',
    final_price: 2,
    Product_Stock: 8,
    has_discount: false,
    review_summary: { average_rating: '3.5', review_count: 2 },
    specs: { 9: { label: 'Cut resistant' } },
  },
  {
    id: 3,
    Product_Name: 'Cutting Wheel',
    final_price: 7,
    Product_Stock: 3,
    has_discount: true,
    review_summary: { average_rating: '4.9', review_count: 4 },
    specs: {},
  },
]

test('productSearchText includes localized names and specification labels', () => {
  assert.match(productSearchText(rows[1]), /Safety Glove/)
  assert.match(productSearchText(rows[1]), /قفاز سلامة/)
  assert.match(productSearchText(rows[1]), /Cut resistant/)
})

test('filterAndSortProducts supports query, stock, discount, price, and rating sorting', () => {
  assert.deepEqual(
    filterAndSortProducts(rows, { query: 'cut', inStockOnly: true, sort: 'rating_desc' }).map((row) => row.id),
    [3, 2]
  )

  assert.deepEqual(
    filterAndSortProducts(rows, { onSaleOnly: true, sort: 'price_asc' }).map((row) => row.id),
    [1, 3]
  )

  assert.deepEqual(
    filterAndSortProducts(rows, { sort: 'price_desc' }).map((row) => row.id),
    [3, 1, 2]
  )
})

test('updateRecentlyViewed deduplicates current product and caps list length', () => {
  const next = updateRecentlyViewed(
    [
      { id: 8, slug: 'old' },
      { id: 9, slug: 'keep' },
      { id: 7, slug: 'older' },
    ],
    { id: 9, slug: 'keep', name: 'Kept Product' },
    2
  )

  assert.deepEqual(next, [
    { id: 9, slug: 'keep', name: 'Kept Product' },
    { id: 8, slug: 'old' },
  ])
})
