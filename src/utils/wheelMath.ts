export const DEFAULT_WHEEL_EXTRA_TURNS = 6

interface WheelRotationOptions {
  itemCount: number
  winnerIndex: number
  currentRotation: number
  extraTurns?: number
}

interface WheelWinnerOptions {
  itemCount: number
  rotation: number
}

export function calculateWheelRotation(options: WheelRotationOptions): number {
  const { itemCount, winnerIndex, currentRotation, extraTurns = DEFAULT_WHEEL_EXTRA_TURNS } = options

  if (itemCount < 1) {
    throw new Error('Wheel must contain at least one item.')
  }

  if (winnerIndex < 0 || winnerIndex >= itemCount) {
    throw new Error('Winner index is outside the wheel bounds.')
  }

  if (itemCount === 1) {
    return currentRotation + extraTurns * 360
  }

  const segmentAngle = 360 / itemCount
  const winnerCenter = winnerIndex * segmentAngle + segmentAngle / 2
  const normalizedCurrentRotation = normalizeWheelRotation(currentRotation)
  const targetNormalizedRotation = normalizeWheelRotation(360 - winnerCenter)
  const delta = normalizeWheelRotation(targetNormalizedRotation - normalizedCurrentRotation)

  return currentRotation + extraTurns * 360 + delta
}

export function getWinnerIndexFromRotation(options: WheelWinnerOptions): number {
  const { itemCount, rotation } = options

  if (itemCount < 1) {
    throw new Error('Wheel must contain at least one item.')
  }

  if (itemCount === 1) {
    return 0
  }

  const segmentAngle = 360 / itemCount
  const wheelAngleAtPointer = normalizeWheelRotation(360 - rotation)
  const epsilon = segmentAngle / 1000

  return Math.floor((wheelAngleAtPointer + epsilon) / segmentAngle) % itemCount
}

export function truncateWheelLabel(label: string, maxLength = 18): string {
  const normalized = label.trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`
}

export function normalizeWheelRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360
}
