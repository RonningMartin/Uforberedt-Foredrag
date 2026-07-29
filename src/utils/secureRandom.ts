export interface RandomSource {
  getRandomValues(buffer: Uint32Array): Uint32Array
}

const UINT32_RANGE = 0x1_0000_0000

export function getSecureRandomIndex(
  itemCount: number,
  randomSource: RandomSource = getDefaultRandomSource(),
): number {
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new Error('itemCount must be a positive integer')
  }

  const buffer = new Uint32Array(1)
  const unbiasedUpperBound = Math.floor(UINT32_RANGE / itemCount) * itemCount

  while (true) {
    randomSource.getRandomValues(buffer)
    const candidate = buffer[0] ?? 0

    // Rejection sampling avoids modulo bias when itemCount does not divide 2^32 evenly.
    if (candidate < unbiasedUpperBound) {
      return candidate % itemCount
    }
  }
}

export function selectSecureRandomItem<T>(
  items: readonly T[],
  randomSource?: RandomSource,
): {
  item: T
  index: number
} {
  const index = getSecureRandomIndex(items.length, randomSource)

  return {
    item: items[index] as T,
    index,
  }
}

function getDefaultRandomSource(): RandomSource {
  const cryptoApi = globalThis.crypto

  if (cryptoApi === undefined) {
    throw new Error('Secure random values are not available in this environment')
  }

  return cryptoApi
}
