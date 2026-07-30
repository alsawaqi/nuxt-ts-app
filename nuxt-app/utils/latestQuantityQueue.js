const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds)
})

/**
 * Keeps cart quantity writes ordered while coalescing rapid clicks to the
 * latest absolute quantity. The caller remains responsible for applying the
 * optimistic UI value and reconciling each authoritative server response.
 */
export function createLatestQuantityQueue({
  persist,
  delayMs = 200,
  onResult = () => {},
  onError = () => {},
  onPendingChange = () => {},
}) {
  if (typeof persist !== 'function') {
    throw new TypeError('createLatestQuantityQueue requires a persist function')
  }

  const states = new Map()
  let persistenceTail = Promise.resolve()

  const desiredEntries = (excludedKey) => Array.from(states.entries())
    .filter(([key]) => key !== excludedKey)
    .map(([key, state]) => [key, state.desired])

  const notifyPendingChange = () => {
    onPendingChange(states.size)
  }

  const run = async (key, state) => {
    if (delayMs > 0) await wait(delayMs)

    try {
      while (true) {
        const target = state.desired
        const result = await persist(key, target)

        state.confirmed = target
        state.lastResult = result
        await onResult(key, target, result)

        if (state.desired === target) return result
      }
    } catch (error) {
      try {
        await onError(key, error, {
          confirmed: state.confirmed,
          lastResult: state.lastResult,
        })
      } catch {
        // Preserve the original persistence error for the UI.
      }

      throw error
    } finally {
      if (states.get(key) === state) {
        states.delete(key)
        notifyPendingChange()
      }
    }
  }

  const enqueue = (key, desired, confirmed = desired) => {
    const existing = states.get(key)
    if (existing) {
      existing.desired = desired
      return existing.promise
    }

    const state = {
      desired,
      confirmed,
      lastResult: null,
      promise: null,
    }

    states.set(key, state)

    // Cart responses contain the entire cart. Serializing all product writes
    // prevents an older full-cart response from overwriting a newer response
    // for a different product.
    state.promise = persistenceTail.then(
      () => run(key, state),
      () => run(key, state),
    )
    persistenceTail = state.promise.catch(() => {})
    notifyPendingChange()

    return state.promise
  }

  return {
    enqueue,
    desiredEntries,
    isPending: (key) => states.has(key),
    hasPending: () => states.size > 0,
  }
}
