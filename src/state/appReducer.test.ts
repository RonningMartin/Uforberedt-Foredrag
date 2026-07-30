import { describe, expect, it } from 'vitest'

import { createInitialAppState } from './appState'
import { appReducer } from './appReducer'

describe('appReducer', () => {
  it('adds and updates participants and presentations', () => {
    const participant = createParticipant('participant-1', 'Ada')
    const presentation = createPresentation('presentation-1', 'Romfart')

    const initialState = createInitialAppState()
    const participantState = appReducer(initialState, {
      type: 'addParticipant',
      participant,
    })
    const fullState = appReducer(participantState, {
      type: 'addPresentation',
      presentation,
    })
    const updatedState = appReducer(fullState, {
      type: 'updateParticipant',
      participantId: participant.id,
      name: 'Ada Lovelace',
    })
    const finalState = appReducer(updatedState, {
      type: 'updatePresentation',
      presentationId: presentation.id,
      title: 'Romfart og stjerner',
      url: 'https://example.com/stjerner',
    })

    expect(finalState.participants[0]?.name).toBe('Ada Lovelace')
    expect(finalState.presentations[0]).toMatchObject({
      title: 'Romfart og stjerner',
      url: 'https://example.com/stjerner',
    })
  })

  it('restores used entities and can toggle active state', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [createParticipant('participant-1', 'Ada', { isActive: false, isUsed: true })],
      presentations: [
        createPresentation('presentation-1', 'Romfart', {
          isActive: false,
          isUsed: true,
        }),
      ],
    }

    const restoredParticipants = appReducer(initialState, {
      type: 'restoreParticipant',
      participantId: 'participant-1',
    })
    const restoredAll = appReducer(restoredParticipants, {
      type: 'restorePresentation',
      presentationId: 'presentation-1',
    })
    const toggledState = appReducer(restoredAll, {
      type: 'setParticipantActive',
      participantId: 'participant-1',
      isActive: false,
    })

    expect(restoredAll.participants[0]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
    expect(restoredAll.presentations[0]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
    expect(toggledState.participants[0]?.isActive).toBe(false)
  })

  it('reconciles unfinished rounds when referenced entities are deleted', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [
        createParticipant('participant-1', 'Ada'),
        createParticipant('participant-2', 'Bjarne'),
      ],
      presentations: [createPresentation('presentation-1', 'Romfart')],
      currentRound: {
        id: 'round-1',
        step: 'confirm' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: null,
        startedAt: '2026-07-29T10:00:00.000Z',
      },
    }

    const afterTeammateDelete = appReducer(initialState, {
      type: 'deleteParticipant',
      participantId: 'participant-2',
    })
    const afterPrimaryDelete = appReducer(initialState, {
      type: 'deleteParticipant',
      participantId: 'participant-1',
    })
    const afterPresentationDelete = appReducer(initialState, {
      type: 'deletePresentation',
      presentationId: 'presentation-1',
    })

    expect(afterTeammateDelete.currentRound).toMatchObject({
      step: 'participant',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: null,
      presentationId: null,
    })
    expect(afterPrimaryDelete.currentRound).toBeNull()
    expect(afterPresentationDelete.currentRound).toMatchObject({
      step: 'presentation',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
      presentationId: null,
    })
  })

  it('marks a confirmed soloround as used and stores it in history', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [createParticipant('participant-1', 'Ada')],
      presentations: [createPresentation('presentation-1', 'Romfart')],
      currentRound: {
        id: 'round-1',
        step: 'confirm' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: null,
        startedAt: '2026-07-29T10:00:00.000Z',
      },
    }

    const nextState = appReducer(initialState, {
      type: 'confirmCurrentRound',
      historyEntry: {
        id: 'history-1',
        roundNumber: 1,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-29T10:05:00.000Z',
      },
    })

    expect(nextState.participants[0]?.isUsed).toBe(true)
    expect(nextState.presentations[0]?.isUsed).toBe(true)
    expect(nextState.history).toHaveLength(1)
    expect(nextState.history[0]?.teammateParticipantId).toBeNull()
    expect(nextState.currentRound).toMatchObject({
      step: 'complete',
      historyEntryId: 'history-1',
    })
  })

  it('marks both team participants as used when a lagrunde is confirmed', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [
        createParticipant('participant-1', 'Ada'),
        createParticipant('participant-2', 'Bjarne'),
      ],
      presentations: [createPresentation('presentation-1', 'Romfart')],
      currentRound: {
        id: 'round-1',
        step: 'confirm' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: null,
        startedAt: '2026-07-29T10:00:00.000Z',
      },
    }

    const nextState = appReducer(initialState, {
      type: 'confirmCurrentRound',
      historyEntry: {
        id: 'history-1',
        roundNumber: 1,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-29T10:05:00.000Z',
      },
    })

    expect(nextState.participants.every((participant) => participant.isUsed)).toBe(true)
    expect(nextState.presentations[0]?.isUsed).toBe(true)
    expect(nextState.history[0]).toMatchObject({
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
    })
  })

  it('undoes the last lagrunde and restores both participants and the presentation', () => {
    const initialState = {
      ...createInitialAppState(),
      activeView: 'history' as const,
      participants: [
        createParticipant('participant-1', 'Ada', { isUsed: true }),
        createParticipant('participant-2', 'Bjarne', { isUsed: true }),
      ],
      presentations: [createPresentation('presentation-1', 'Romfart', { isUsed: true })],
      history: [
        {
          id: 'history-1',
          roundNumber: 1,
          primaryParticipantId: 'participant-1',
          primaryParticipantName: 'Ada',
          teammateParticipantId: 'participant-2',
          teammateParticipantName: 'Bjarne',
          presentationId: 'presentation-1',
          presentationTitle: 'Romfart',
          presentationUrl: 'https://example.com/romfart',
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
      currentRound: {
        id: 'round-1',
        step: 'complete' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: 'history-1',
        startedAt: '2026-07-30T10:00:00.000Z',
      },
    }

    const nextState = appReducer(initialState, {
      type: 'undoLastRound',
    })

    expect(nextState.history).toHaveLength(0)
    expect(nextState.participants.every((participant) => participant.isUsed === false)).toBe(true)
    expect(nextState.presentations[0]?.isUsed).toBe(false)
    expect(nextState.currentRound).toBeNull()
    expect(nextState.activeView).toBe('history')
  })
})

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
    url: string
    isActive: boolean
    isUsed: boolean
  }>,
) {
  return {
    id,
    title,
    url: overrides?.url ?? `https://example.com/${id}`,
    isActive: overrides?.isActive ?? true,
    isUsed: overrides?.isUsed ?? false,
  }
}
