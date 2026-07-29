import { describe, expect, it } from 'vitest'

import { getSecureRandomIndex, selectSecureRandomItem } from './secureRandom'
import type { RandomSource } from './secureRandom'

class QueueRandomSource implements RandomSource {
  constructor(private readonly values: number[]) {}

  getRandomValues(buffer: Uint32Array) {
    const nextValue = this.values.shift()

    if (nextValue === undefined) {
      throw new Error('No more random values in queue')
    }

    buffer[0] = nextValue
    return buffer
  }
}

describe('getSecureRandomIndex', () => {
  it('returns a valid unbiased index', () => {
    const source = new QueueRandomSource([0xffffffff, 4])

    const index = getSecureRandomIndex(3, source)

    expect(index).toBe(1)
  })

  it('throws when called with an empty candidate list', () => {
    expect(() => getSecureRandomIndex(0)).toThrow('itemCount must be a positive integer')
  })
})

describe('selectSecureRandomItem', () => {
  it('selects an item that exists in the candidate list', () => {
    const source = new QueueRandomSource([2])
    const result = selectSecureRandomItem(['A', 'B', 'C'], source)

    expect(result).toEqual({
      item: 'C',
      index: 2,
    })
  })
})
