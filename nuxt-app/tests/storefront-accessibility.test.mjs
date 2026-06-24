import test from 'node:test'
import assert from 'node:assert/strict'
import {
  activeDescendantState,
  buttonLabel,
  fieldA11y,
  quantityButtonLabel,
} from '../utils/accessibility.js'

test('quantity buttons announce action, product, and resulting quantity', () => {
  assert.equal(
    quantityButtonLabel('increase', 'Safety Helmet', 3),
    'Increase quantity for Safety Helmet to 3'
  )

  assert.equal(
    quantityButtonLabel('decrease', 'Safety Helmet', 1, 'ar'),
    'تقليل كمية Safety Helmet إلى 1'
  )
})

test('fieldA11y returns invalid and described-by attributes only when needed', () => {
  assert.deepEqual(fieldA11y({ id: 'card-number', invalid: true, hint: true }), {
    id: 'card-number',
    'aria-invalid': 'true',
    'aria-describedby': 'card-number-hint card-number-error',
  })

  assert.deepEqual(fieldA11y({ id: 'payer-name', invalid: false }), {
    id: 'payer-name',
    'aria-invalid': 'false',
  })
})

test('button labels and active-descendant state are screen-reader friendly', () => {
  assert.equal(buttonLabel('Clear cart', '3 items'), 'Clear cart, 3 items')
  assert.deepEqual(activeDescendantState(true, 'filter-brand-options'), {
    'aria-expanded': 'true',
    'aria-controls': 'filter-brand-options',
  })
})
