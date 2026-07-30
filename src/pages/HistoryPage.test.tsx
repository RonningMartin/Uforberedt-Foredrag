// @vitest-environment jsdom

import { act, useEffect, useReducer } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createInitialAppState } from '../state/appState'
import { appReducer } from '../state/appReducer'
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
  it('shows both solo and team rounds and can undo the latest lagrunde', () => {
    const view = renderHistoryPage()

    expect(view.container.textContent).toContain('Runde 2')
    expect(view.container.textContent).toContain('Siste runde')
    expect(view.container.textContent).toContain('Bjarne + Cora')
    expect(view.container.textContent).toContain('Ada')
    expect(view.container.textContent).toContain('https://example.com/sirkler')

    view.click('Angre siste runde')

    expect(view.getLatestState().history).toHaveLength(1)
    expect(view.getLatestState().participants[1]?.isUsed).toBe(false)
    expect(view.getLatestState().participants[2]?.isUsed).toBe(false)
    expect(view.getLatestState().presentations[1]?.isUsed).toBe(false)
  })

  it('can restore the primary participant, teammate and presentation from history', () => {
    const view = renderHistoryPage({
      initialState: createHistoryState({
        presentations: [
          createPresentation('presentation-1', 'Romfart'),
          createPresentation('presentation-2', 'Sirkler', {
            isActive: false,
            isUsed: true,
          }),
        ],
      }),
    })

    view.click('Gjenopprett hoveddeltaker')
    view.click('Gjenopprett lagkamerat')
    view.click('Gjenopprett presentasjon')

    expect(view.getLatestState().participants[1]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
    expect(view.getLatestState().participants[2]).toMatchObject({
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
    expect(view.getLatestState().participants).toHaveLength(3)
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
      createParticipant('participant-1', 'Ada'),
      createParticipant('participant-2', 'Bjarne', { isUsed: true }),
      createParticipant('participant-3', 'Cora', { isUsed: true }),
    ],
    presentations: [
      createPresentation('presentation-1', 'Romfart'),
      createPresentation('presentation-2', 'Sirkler', { isUsed: true }),
    ],
    history: [
      {
        id: 'history-1',
        roundNumber: 1,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-30T10:00:00.000Z',
      },
      {
        id: 'history-2',
        roundNumber: 2,
        primaryParticipantId: 'participant-2',
        primaryParticipantName: 'Bjarne',
        teammateParticipantId: 'participant-3',
        teammateParticipantName: 'Cora',
        presentationId: 'presentation-2',
        presentationTitle: 'Sirkler',
        presentationUrl: 'https://example.com/sirkler',
        completedAt: '2026-07-30T10:05:00.000Z',
      },
    ],
    currentRound: {
      id: 'round-2',
      step: 'complete',
      primaryParticipantId: 'participant-2',
      primaryParticipantName: 'Bjarne',
      teammateParticipantId: 'participant-3',
      teammateParticipantName: 'Cora',
      presentationId: 'presentation-2',
      presentationTitle: 'Sirkler',
      presentationUrl: 'https://example.com/sirkler',
      historyEntryId: 'history-2',
      startedAt: '2026-07-30T09:59:00.000Z',
    },
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

function createPresentation(
  id: string,
  title: string,
  overrides?: Partial<{
    isActive: boolean
    isUsed: boolean
  }>,
) {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    isActive: overrides?.isActive ?? true,
    isUsed: overrides?.isUsed ?? false,
  }
}
