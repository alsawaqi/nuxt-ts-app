import assert from 'node:assert/strict'
import test from 'node:test'

import { createLatestQuantityQueue } from '../utils/latestQuantityQueue.js'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })

  return { promise, resolve, reject }
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))

test('rapid changes before persistence coalesce to the latest quantity', async () => {
  const writes = []
  const pending = []
  const request = deferred()
  const queue = createLatestQuantityQueue({
    delayMs: 0,
    persist: async (_productId, quantity) => {
      writes.push(quantity)
      return request.promise
    },
    onPendingChange: (count) => pending.push(count),
  })

  const first = queue.enqueue(7, 2, 1)
  const second = queue.enqueue(7, 5, 1)
  await nextTask()

  assert.strictEqual(first, second)
  assert.deepEqual(writes, [5])
  assert.equal(queue.isPending(7), true)

  request.resolve({ quantity: 5 })
  await first

  assert.equal(queue.hasPending(), false)
  assert.deepEqual(pending, [1, 0])
})

test('a newer quantity received in flight is serialized after the first write', async () => {
  const writes = []
  const requests = [deferred(), deferred()]
  const queue = createLatestQuantityQueue({
    delayMs: 0,
    persist: async (_productId, quantity) => {
      writes.push(quantity)
      return requests[writes.length - 1].promise
    },
  })

  const completion = queue.enqueue(3, 2, 1)
  await nextTask()
  queue.enqueue(3, 6, 1)

  requests[0].resolve({ quantity: 2 })
  await nextTask()
  assert.deepEqual(writes, [2, 6])

  requests[1].resolve({ quantity: 6 })
  await completion
  assert.equal(queue.hasPending(), false)
})

test('writes for different products are globally serialized', async () => {
  const writes = []
  const requests = [deferred(), deferred()]
  const queue = createLatestQuantityQueue({
    delayMs: 0,
    persist: async (productId, quantity) => {
      writes.push({ productId, quantity })
      return requests[writes.length - 1].promise
    },
  })

  const first = queue.enqueue(1, 2, 1)
  const second = queue.enqueue(2, 4, 1)
  await nextTask()
  assert.deepEqual(writes, [{ productId: 1, quantity: 2 }])

  requests[0].resolve({ productId: 1, quantity: 2 })
  await nextTask()
  assert.deepEqual(writes, [
    { productId: 1, quantity: 2 },
    { productId: 2, quantity: 4 },
  ])

  requests[1].resolve({ productId: 2, quantity: 4 })
  await Promise.all([first, second])
  assert.equal(queue.hasPending(), false)
})

test('persistence errors expose the last confirmed server result and release the queue', async () => {
  const results = []
  const errors = []
  let call = 0
  const firstRequest = deferred()
  const secondRequest = deferred()
  const queue = createLatestQuantityQueue({
    delayMs: 0,
    persist: async () => {
      call += 1
      return call === 1 ? firstRequest.promise : secondRequest.promise
    },
    onResult: (_key, quantity, result) => results.push({ quantity, result }),
    onError: (_key, error, state) => errors.push({ error, state }),
  })

  const completion = queue.enqueue(9, 2, 1)
  await nextTask()
  queue.enqueue(9, 4, 1)

  firstRequest.resolve({ quantity: 2 })
  await nextTask()
  const failure = new Error('network failed')
  secondRequest.reject(failure)

  await assert.rejects(completion, /network failed/)
  assert.deepEqual(results, [{ quantity: 2, result: { quantity: 2 } }])
  assert.equal(errors[0].error, failure)
  assert.deepEqual(errors[0].state, {
    confirmed: 2,
    lastResult: { quantity: 2 },
  })
  assert.equal(queue.hasPending(), false)
})
