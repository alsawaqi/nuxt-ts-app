import test from 'node:test'
import assert from 'node:assert/strict'

import {
  directionFor,
  isSupportedLocale,
  localizedField,
  productDisplayName,
  t,
} from '../utils/storefrontI18n.js'

test('locale validation and direction are stable', () => {
  assert.equal(isSupportedLocale('en'), true)
  assert.equal(isSupportedLocale('ar'), true)
  assert.equal(isSupportedLocale('fr'), false)
  assert.equal(directionFor('en'), 'ltr')
  assert.equal(directionFor('ar'), 'rtl')
})

test('localizedField prefers Arabic fields in Arabic and falls back to English', () => {
  const product = {
    Product_Name: 'Cutting Disc',
    Product_Name_Ar: 'قرص قطع',
  }

  assert.equal(localizedField(product, ['Product_Name'], 'en'), 'Cutting Disc')
  assert.equal(localizedField(product, ['Product_Name'], 'ar'), 'قرص قطع')
  assert.equal(localizedField({ Product_Name: 'Safety Gloves' }, ['Product_Name'], 'ar'), 'Safety Gloves')
})

test('productDisplayName understands common storefront product aliases', () => {
  const row = {
    name: 'Grinding Wheel',
    name_ar: 'حجر جلخ',
  }

  assert.equal(productDisplayName(row, 'ar'), 'حجر جلخ')
  assert.equal(productDisplayName(row, 'en'), 'Grinding Wheel')
})

test('t returns translated static UI and interpolates values', () => {
  assert.equal(t('nav.cart', 'ar'), 'السلة')
  assert.equal(t('product.unitsAvailable', 'ar', { count: 8 }), '8 وحدة متوفرة')
  assert.equal(t('missing.key', 'ar'), 'missing.key')
})
