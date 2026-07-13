import test from 'node:test'
import assert from 'node:assert/strict'

import { createLatestRequestGate } from '../utils/latestRequestGate.js'

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

test('an older response cannot overwrite a newer shipping request', async () => {
  const gate = createLatestRequestGate()
  const first = deferred()
  const second = deferred()
  const accepted = []

  const apply = async (requestId, pending) => {
    const value = await pending
    if (gate.isCurrent(requestId)) accepted.push(value)
  }

  const firstId = gate.begin()
  const firstApply = apply(firstId, first.promise)
  const secondId = gate.begin()
  const secondApply = apply(secondId, second.promise)

  second.resolve('new quote')
  await secondApply
  first.resolve('stale quote')
  await firstApply

  assert.deepEqual(accepted, ['new quote'])
})

test('clearing shipping quotes invalidates an in-flight response', async () => {
  const gate = createLatestRequestGate()
  const pending = deferred()
  const accepted = []
  const requestId = gate.begin()
  const apply = pending.promise.then(value => {
    if (gate.isCurrent(requestId)) accepted.push(value)
  })

  gate.invalidate()
  pending.resolve('obsolete quote')
  await apply

  assert.deepEqual(accepted, [])
})
