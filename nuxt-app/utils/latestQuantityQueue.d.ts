export interface LatestQuantityErrorState<Result> {
  confirmed: number
  lastResult: Result | null
}

export interface LatestQuantityQueue<Key, Result> {
  enqueue: (key: Key, desired: number, confirmed?: number) => Promise<Result>
  desiredEntries: (excludedKey?: Key) => Array<[Key, number]>
  isPending: (key: Key) => boolean
  hasPending: () => boolean
}

export function createLatestQuantityQueue<Key = number, Result = unknown>(options: {
  persist: (key: Key, desired: number) => Promise<Result>
  delayMs?: number
  onResult?: (key: Key, confirmed: number, result: Result) => void | Promise<void>
  onError?: (
    key: Key,
    error: unknown,
    state: LatestQuantityErrorState<Result>,
  ) => void | Promise<void>
  onPendingChange?: (count: number) => void
}): LatestQuantityQueue<Key, Result>
