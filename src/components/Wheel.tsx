import type { CSSProperties, TransitionEvent } from 'react'

import { truncateWheelLabel } from '../utils/wheelMath'

export interface WheelItem {
  id: string
  label: string
}

interface WheelProps {
  ariaLabel: string
  items: readonly WheelItem[]
  rotation: number
  spinning: boolean
  winnerIndex: number | null
  emptyLabel: string
  onSpinEnd?: () => void
}

const WHEEL_SPIN_DURATION_MS = 4200

function Wheel({
  ariaLabel,
  items,
  rotation,
  spinning,
  winnerIndex,
  emptyLabel,
  onSpinEnd,
}: WheelProps) {
  const segmentAngle = items.length > 0 ? 360 / items.length : 360
  const gradient = createWheelGradient(items.length)

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'transform' || !spinning) {
      return
    }

    onSpinEnd?.()
  }

  return (
    <div className={getWheelClassName(items.length)} role="img" aria-label={ariaLabel}>
      <div className="wheel__pointer" aria-hidden="true" />

      <div
        className="wheel__track"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: spinning ? `${WHEEL_SPIN_DURATION_MS}ms` : '0ms',
          backgroundImage: gradient,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {items.length === 0 ? <p className="wheel__empty">{emptyLabel}</p> : null}

        {items.length > 1
          ? items.map((item, index) => (
              <span
                key={`${item.id}-separator`}
                className="wheel__separator"
                style={getSeparatorStyle(index, segmentAngle)}
                aria-hidden="true"
              />
            ))
          : null}

        {items.map((item, index) => (
          <span
            key={item.id}
            className={getLabelClassName(index === winnerIndex && !spinning)}
            style={getLabelStyle(index, segmentAngle, items.length)}
            title={item.label}
          >
            {items.length === 1 ? item.label : truncateWheelLabel(item.label)}
          </span>
        ))}

        <div className="wheel__hub" aria-hidden="true" />
      </div>
    </div>
  )
}

function createWheelGradient(itemCount: number): string {
  if (itemCount <= 0) {
    return 'radial-gradient(circle at center, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.22))'
  }

  const palette = ['#fcbf49', '#f77f00', '#eae2b7', '#dfe7fd', '#c9d6ea', '#f4d58d']
  const segmentAngle = 360 / itemCount
  const stops = Array.from({ length: itemCount }, (_, index) => {
    const start = index * segmentAngle
    const end = start + segmentAngle
    const color = palette[index % palette.length]

    return `${color} ${start}deg ${end}deg`
  })

  return `conic-gradient(from 0deg, ${stops.join(', ')})`
}

function getWheelClassName(itemCount: number): string {
  const classNames = ['wheel']

  if (itemCount === 1) {
    classNames.push('wheel--single')
  }

  if (itemCount > 10) {
    classNames.push('wheel--dense')
  }

  return classNames.join(' ')
}

function getLabelClassName(isWinner: boolean): string {
  return isWinner ? 'wheel__label is-winner' : 'wheel__label'
}

function getLabelStyle(index: number, segmentAngle: number, itemCount: number): CSSProperties {
  if (itemCount === 1) {
    return {
      transform: 'translate(-50%, -50%)',
      maxWidth: '70%',
    }
  }

  const angle = index * segmentAngle + segmentAngle / 2

  return {
    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--wheel-label-distance) * -1)) rotate(${-angle}deg)`,
  }
}

function getSeparatorStyle(index: number, segmentAngle: number): CSSProperties {
  return {
    transform: `translateX(-50%) rotate(${index * segmentAngle}deg)`,
  }
}

export default Wheel
