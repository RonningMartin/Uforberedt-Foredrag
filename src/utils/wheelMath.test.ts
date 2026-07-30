import { describe, expect, it } from 'vitest'

import {
  calculateWheelRotation,
  getWinnerIndexFromRotation,
  truncateWheelLabel,
} from './wheelMath'

describe('wheelMath', () => {
  it('lands on the predetermined winner after the calculated rotation', () => {
    const scenarios = [
      { itemCount: 2, winnerIndex: 0, currentRotation: 15 },
      { itemCount: 3, winnerIndex: 2, currentRotation: 120 },
      { itemCount: 7, winnerIndex: 4, currentRotation: 315 },
    ]

    scenarios.forEach((scenario) => {
      const rotation = calculateWheelRotation({
        itemCount: scenario.itemCount,
        winnerIndex: scenario.winnerIndex,
        currentRotation: scenario.currentRotation,
      })

      expect(
        getWinnerIndexFromRotation({
          itemCount: scenario.itemCount,
          rotation,
        }),
      ).toBe(scenario.winnerIndex)
    })
  })

  it('handles a wheel with a single candidate', () => {
    const rotation = calculateWheelRotation({
      itemCount: 1,
      winnerIndex: 0,
      currentRotation: 45,
    })

    expect(rotation).toBeGreaterThan(45)
    expect(
      getWinnerIndexFromRotation({
        itemCount: 1,
        rotation,
      }),
    ).toBe(0)
  })

  it('truncates long wheel labels without changing short labels', () => {
    expect(truncateWheelLabel('Kort navn')).toBe('Kort navn')
    expect(truncateWheelLabel('Dette er en veldig lang presentasjonstittel', 18)).toBe(
      'Dette er en vel...',
    )
  })
})
