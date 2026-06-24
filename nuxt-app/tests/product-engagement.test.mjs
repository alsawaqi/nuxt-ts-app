import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatRatingSummary,
  moderationBadgeClass,
  starStates,
} from '../utils/productEngagement.js'

test('rating summaries are formatted for product cards and detail pages', () => {
  assert.deepEqual(formatRatingSummary({ average_rating: '4.50', review_count: 12 }), {
    average: '4.5',
    count: 12,
    label: '4.5 out of 5 from 12 reviews',
  })

  assert.deepEqual(formatRatingSummary(null), {
    average: '0.0',
    count: 0,
    label: 'No reviews yet',
  })
})

test('star states support full, half, and empty display', () => {
  assert.deepEqual(starStates(3.5), ['full', 'full', 'full', 'half', 'empty'])
  assert.deepEqual(starStates(0), ['empty', 'empty', 'empty', 'empty', 'empty'])
})

test('moderation badge classes are readable and stable', () => {
  assert.equal(moderationBadgeClass('approved'), 'badge-success')
  assert.equal(moderationBadgeClass('reported'), 'badge-danger')
  assert.equal(moderationBadgeClass('pending'), 'badge-warning')
})
