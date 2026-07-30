// @vitest-environment jsdom

import { act, useEffect, useReducer } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialAppState } from '../state/appState'
import { appReducer } from '../state/appReducer'
import type { AppState } from '../types/app'
import type { RandomSource } from '../utils/secureRandom'
import EventPage from './EventPage'

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

interface RenderResult {
  container: HTMLDivElement
  getButton: (label: string) => HTMLButtonElement
  clickControl: (label: string) => void
  dispatchKey: (target: EventTarget, key: string, options?: KeyboardOptions) => void
  finishSpin: () => void
  getLatestState: () => AppState
}

interface KeyboardOptions {
  repeat?: boolean
}

let host: HTMLDivElement
let activeRoot: Root | null = null

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  if (activeRoot !== null) {
    act(() => {
      activeRoot?.unmount()
    })
    activeRoot = null
  }

  document.body.innerHTML = ''
})

describe('EventPage', () => {
  it('shows the predetermined participant after the wheel animation and disables controls while spinning', () => {
    const view = renderEventPage({
      participantRandomValues: [1],
    })

    expect(view.container.textContent?.includes('Valgt deltaker')).toBe(false)

    view.clickControl('Spinn hjulet')

    expect(view.getButton('Spinn hjulet').disabled).toBe(true)
    expect(view.container.textContent?.includes('Valgt deltaker')).toBe(false)

    view.finishSpin()

    expect(view.container.textContent).toContain('Valgt deltaker')
    expect(view.container.textContent).toContain('Bjarne')
    expect(view.getLatestState().currentRound?.primaryParticipantName).toBe('Bjarne')
  })

  it('supports the teammate flow and only replaces the temporary teammate when spinning again', () => {
    const view = renderEventPage({
      initialState: createBaseState({
        participants: [
          createParticipant('participant-1', 'Ada'),
          createParticipant('participant-2', 'Bjarne'),
          createParticipant('participant-3', 'Cora'),
        ],
      }),
      participantRandomValues: [0, 1, 0],
    })

    view.clickControl('Spinn hjulet')
    view.finishSpin()
    view.clickControl('Legg til lagkamerat')

    view.clickControl('Spinn hjulet')
    view.finishSpin()

    expect(view.getLatestState().currentRound).toMatchObject({
      step: 'teammate',
      primaryParticipantName: 'Ada',
      teammateParticipantName: 'Cora',
    })
    expect(view.container.textContent).toContain('Ada + Cora')

    view.clickControl('Spinn lagkamerat på nytt')
    view.finishSpin()

    expect(view.getLatestState().currentRound).toMatchObject({
      step: 'teammate',
      primaryParticipantName: 'Ada',
      teammateParticipantName: 'Bjarne',
    })
    expect(view.container.textContent).toContain('Ada + Bjarne')
    expect(view.getLatestState().participants.every((participant) => participant.isUsed === false)).toBe(true)
    expect(view.getLatestState().history).toHaveLength(0)
  })

  it('can remove a teammate and continue as a solorunde', () => {
    const view = renderEventPage({
      participantRandomValues: [0, 0],
    })

    view.clickControl('Spinn hjulet')
    view.finishSpin()
    view.clickControl('Legg til lagkamerat')
    view.clickControl('Spinn hjulet')
    view.finishSpin()

    expect(view.getLatestState().currentRound?.teammateParticipantName).toBe('Bjarne')

    view.clickControl('Fjern lagkamerat')

    expect(view.getLatestState().currentRound).toMatchObject({
      step: 'participant',
      primaryParticipantName: 'Ada',
      teammateParticipantId: null,
      teammateParticipantName: null,
    })
    expect(view.container.textContent).toContain('Fortsett alene')
  })

  it('shows a clear explanation when no valid teammate remains', () => {
    const initialState = createBaseState({
      participants: [
        createParticipant('participant-1', 'Ada'),
        createParticipant('participant-2', 'Bjarne', { isActive: false }),
      ],
    })
    const view = renderEventPage({
      initialState,
      participantRandomValues: [0],
    })

    view.clickControl('Spinn hjulet')
    view.finishSpin()

    expect(view.getButton('Legg til lagkamerat').disabled).toBe(true)
    expect(view.container.textContent).toContain('Ingen tilgjengelig lagkamerat akkurat nå.')
  })

  it('cancels an unfinished lagrunde without marking anyone as used', () => {
    const view = renderEventPage({
      initialState: createBaseState({
        participants: [
          createParticipant('participant-1', 'Ada'),
          createParticipant('participant-2', 'Bjarne'),
          createParticipant('participant-3', 'Cora'),
        ],
      }),
      participantRandomValues: [0, 1],
    })

    view.clickControl('Spinn hjulet')
    view.finishSpin()
    view.clickControl('Legg til lagkamerat')
    view.clickControl('Spinn hjulet')
    view.finishSpin()
    view.clickControl('Avbryt')

    expect(view.getLatestState().currentRound).toBeNull()
    expect(view.getLatestState().participants.every((participant) => participant.isUsed === false)).toBe(true)
    expect(view.getLatestState().presentations.every((presentation) => presentation.isUsed === false)).toBe(true)
    expect(view.getLatestState().history).toHaveLength(0)
  })

  it('keeps the existing keyboard flow working for a solorunde', () => {
    const view = renderEventPage({
      participantRandomValues: [0],
      presentationRandomValues: [1],
    })

    view.dispatchKey(window, ' ', { repeat: true })
    expect(view.getLatestState().currentRound).toBeNull()

    view.dispatchKey(window, ' ')
    expect(view.getButton('Spinn hjulet').disabled).toBe(true)
    view.finishSpin()

    view.dispatchKey(window, 'Enter')
    expect(view.getLatestState().currentRound?.step).toBe('presentation')

    const input = document.createElement('input')
    view.container.appendChild(input)
    input.focus()
    view.dispatchKey(input, ' ')
    expect(view.getLatestState().currentRound?.presentationId).toBeNull()

    view.dispatchKey(window, ' ')
    view.finishSpin()
    expect(view.getLatestState().currentRound?.presentationTitle).toBe('Sirkler')

    view.dispatchKey(window, 'Enter')
    expect(view.getLatestState().currentRound?.step).toBe('confirm')

    view.dispatchKey(window, 'Enter')
    expect(view.getLatestState().currentRound?.step).toBe('complete')
    expect(view.getLatestState().history).toHaveLength(1)
    expect(view.getLatestState().history[0]?.teammateParticipantId).toBeNull()
  })

  it('opens the selected presentation with the correct URL without confirming the round', () => {
    const openWindow = vi.fn(() => ({ opener: window } as unknown as Window))
    const initialState = createBaseState({
      currentRound: {
        id: 'round-1',
        step: 'presentation',
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romskip',
        presentationUrl: 'https://example.com/romskip',
        historyEntryId: null,
        startedAt: '2026-07-30T10:00:00.000Z',
      },
    })
    const view = renderEventPage({
      initialState,
      openWindow,
    })

    view.clickControl('Åpne presentasjon ↗')

    expect(openWindow).toHaveBeenCalledWith(
      'https://example.com/romskip',
      '_blank',
      'noopener,noreferrer',
    )
    expect(view.getLatestState().history).toHaveLength(0)
    expect(view.getLatestState().participants.every((participant) => participant.isUsed === false)).toBe(true)
  })
})

function renderEventPage(options: {
  initialState?: AppState
  participantRandomValues?: number[]
  presentationRandomValues?: number[]
  openWindow?: (url: string, target?: string, features?: string) => Window | null
}): RenderResult {
  let latestState = options.initialState ?? createBaseState()
  const participantRandomSource =
    options.participantRandomValues === undefined
      ? undefined
      : new QueueRandomSource([...options.participantRandomValues])
  const presentationRandomSource =
    options.presentationRandomValues === undefined
      ? undefined
      : new QueueRandomSource([...options.presentationRandomValues])
  const root = createRoot(host)
  activeRoot = root

  function TestHarness() {
    const [state, dispatch] = useReducer(appReducer, options.initialState ?? createBaseState())

    useEffect(() => {
      latestState = state
    }, [state])

    return (
      <EventPage
        state={state}
        dispatch={dispatch}
        participantRandomSource={participantRandomSource}
        presentationRandomSource={presentationRandomSource}
        openWindow={options.openWindow}
      />
    )
  }

  act(() => {
    root.render(<TestHarness />)
  })

  return {
    container: host,
    getLatestState: () => latestState,
    getButton: (label) => {
      const button = Array.from(host.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === label,
      )

      if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`Button not found: ${label}`)
      }

      return button
    },
    clickControl: (label) => {
      const control =
        Array.from(host.querySelectorAll('button, a')).find(
          (candidate) => candidate.textContent?.trim() === label,
        ) ?? null

      if (!(control instanceof HTMLElement)) {
        throw new Error(`Control not found: ${label}`)
      }

      act(() => {
        control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
    },
    dispatchKey: (target, key, keyboardOptions) => {
      act(() => {
        target.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            repeat: keyboardOptions?.repeat ?? false,
            bubbles: true,
            cancelable: true,
          }),
        )
      })
    },
    finishSpin: () => {
      const wheelTrack = host.querySelector('.wheel__track')

      if (!(wheelTrack instanceof HTMLElement)) {
        throw new Error('Wheel track not found')
      }

      const event = new Event('transitionend', { bubbles: true })
      Object.defineProperty(event, 'propertyName', {
        value: 'transform',
      })

      act(() => {
        wheelTrack.dispatchEvent(event)
      })
    },
  }
}

function createBaseState(overrides?: Partial<AppState>): AppState {
  return {
    ...createInitialAppState(),
    activeView: 'event',
    participants: [
      createParticipant('participant-1', 'Ada'),
      createParticipant('participant-2', 'Bjarne'),
    ],
    presentations: [
      {
        id: 'presentation-1',
        title: 'Romskip',
        url: 'https://example.com/romskip',
        isActive: true,
        isUsed: false,
      },
      {
        id: 'presentation-2',
        title: 'Sirkler',
        url: 'https://example.com/sirkler',
        isActive: true,
        isUsed: false,
      },
    ],
    ...overrides,
  }
}

function createParticipant(
  id: string,
  name: string,
  overrides?: Partial<{
    isActive: boolean
    isUsed: boolean
  }>,
) {
  return {
    id,
    name,
    isActive: overrides?.isActive ?? true,
    isUsed: overrides?.isUsed ?? false,
  }
}
