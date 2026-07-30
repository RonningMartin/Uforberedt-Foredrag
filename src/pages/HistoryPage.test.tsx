// @vitest-environment jsdom

import { act, useEffect, useReducer } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appReducer } from '../state/appReducer'
import { createInitialAppState } from '../state/appState'
import type { AppState } from '../types/app'
import HistoryPage from './HistoryPage'

interface RenderResult {
  container: HTMLDivElement
  click: (label: string) => void
  getLatestState: () => AppState
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

describe('HistoryPage', () => {
  it('shows saved rounds and can undo the latest round', () => {
    const view = renderHistoryPage()

    expect(view.container.textContent).toContain('Runde 2')
    expect(view.container.textContent).toContain('Siste runde')
    expect(view.container.textContent).toContain('https://example.com/sirkler')

    view.click('Angre siste runde')

    expect(view.getLatestState().history).toHaveLength(1)
    expect(view.getLatestState().participants[1]?.isUsed).toBe(false)
    expect(view.getLatestState().presentations[1]?.isUsed).toBe(false)
  })

  it('can restore a used participant and a deactivated presentation from history', () => {
    const view = renderHistoryPage({
      initialState: createHistoryState({
        presentations: [
          {
            id: 'presentation-1',
            title: 'Romfart',
            url: 'https://example.com/romfart',
            isActive: false,
            isUsed: false,
          },
          {
            id: 'presentation-2',
            title: 'Sirkler',
            url: 'https://example.com/sirkler',
            isActive: true,
            isUsed: true,
          },
        ],
      }),
    })

    view.click('Gjenopprett deltaker')
    view.click('Gjenopprett presentasjon')

    expect(view.getLatestState().participants[1]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
    expect(view.getLatestState().presentations[1]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
  })

  it('offers a reset choice that keeps setup data', () => {
    const view = renderHistoryPage()

    view.click('Nullstill arrangement')
    expect(view.container.textContent).toContain('Behold deltakere og presentasjoner')
    expect(view.container.textContent).toContain('Slett alle data')

    view.click('Behold deltakere og presentasjoner')

    expect(view.getLatestState().history).toHaveLength(0)
    expect(view.getLatestState().participants).toHaveLength(2)
    expect(view.getLatestState().presentations).toHaveLength(2)
    expect(view.getLatestState().participants.every((participant) => participant.isUsed === false)).toBe(true)
    expect(view.getLatestState().activeView).toBe('history')
  })

  it('can delete all application data from the reset dialog', () => {
    const view = renderHistoryPage()

    view.click('Nullstill arrangement')
    view.click('Slett alle data')

    expect(view.getLatestState()).toEqual(createInitialAppState())
  })
})

function renderHistoryPage(options?: { initialState?: AppState }): RenderResult {
  let latestState = options?.initialState ?? createHistoryState()
  const root = createRoot(host)
  activeRoot = root

  function TestHarness() {
    const [state, dispatch] = useReducer(appReducer, options?.initialState ?? createHistoryState())

    useEffect(() => {
      latestState = state
    }, [state])

    return <HistoryPage state={state} dispatch={dispatch} />
  }

  act(() => {
    root.render(<TestHarness />)
  })

  return {
    container: host,
    getLatestState: () => latestState,
    click: (label) => {
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
  }
}

function createHistoryState(overrides?: Partial<AppState>): AppState {
  return {
    ...createInitialAppState(),
    activeView: 'history',
    participants: [
      {
        id: 'participant-1',
        name: 'Ada',
        isActive: true,
        isUsed: false,
      },
      {
        id: 'participant-2',
        name: 'Bjarne',
        isActive: true,
        isUsed: true,
      },
    ],
    presentations: [
      {
        id: 'presentation-1',
        title: 'Romfart',
        url: 'https://example.com/romfart',
        isActive: true,
        isUsed: false,
      },
      {
        id: 'presentation-2',
        title: 'Sirkler',
        url: 'https://example.com/sirkler',
        isActive: true,
        isUsed: true,
      },
    ],
    history: [
      {
        id: 'history-1',
        roundNumber: 1,
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-30T10:00:00.000Z',
      },
      {
        id: 'history-2',
        roundNumber: 2,
        participantId: 'participant-2',
        participantName: 'Bjarne',
        presentationId: 'presentation-2',
        presentationTitle: 'Sirkler',
        presentationUrl: 'https://example.com/sirkler',
        completedAt: '2026-07-30T10:05:00.000Z',
      },
    ],
    currentRound: {
      id: 'round-2',
      step: 'complete',
      participantId: 'participant-2',
      participantName: 'Bjarne',
      presentationId: 'presentation-2',
      presentationTitle: 'Sirkler',
      presentationUrl: 'https://example.com/sirkler',
      historyEntryId: 'history-2',
      startedAt: '2026-07-30T09:59:00.000Z',
    },
    ...overrides,
  }
}
