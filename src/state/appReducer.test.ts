import { describe, expect, it } from 'vitest'

import { appReducer } from './appReducer'
import { createInitialAppState } from './appState'

describe('appReducer', () => {
  it('adds and updates participants and presentations', () => {
    const participant = {
      id: 'participant-1',
      name: 'Ada',
      isActive: true,
      isUsed: false,
    }
    const presentation = {
      id: 'presentation-1',
      title: 'Romfart',
      url: 'https://example.com/romfart',
      isActive: true,
      isUsed: false,
    }

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
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
          isActive: false,
          isUsed: true,
        },
      ],
      presentations: [
        {
          id: 'presentation-1',
          title: 'Romfart',
          url: 'https://example.com/romfart',
          isActive: false,
          isUsed: true,
        },
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

  it('deletes entities and clears an unfinished round that references them', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
          isActive: true,
          isUsed: false,
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
      ],
      currentRound: {
        id: 'round-1',
        step: 'presentation' as const,
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: null,
        startedAt: '2026-07-29T10:00:00.000Z',
      },
    }

    const afterParticipantDelete = appReducer(initialState, {
      type: 'deleteParticipant',
      participantId: 'participant-1',
    })
    const afterPresentationDelete = appReducer(initialState, {
      type: 'deletePresentation',
      presentationId: 'presentation-1',
    })

    expect(afterParticipantDelete.participants).toHaveLength(0)
    expect(afterParticipantDelete.currentRound).toBeNull()
    expect(afterPresentationDelete.presentations).toHaveLength(0)
    expect(afterPresentationDelete.currentRound).toMatchObject({
      step: 'presentation',
      participantId: 'participant-1',
      presentationId: null,
    })
  })

  it('marks both selected entities as used and stores a confirmed round in history', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
          isActive: true,
          isUsed: false,
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
      ],
      currentRound: {
        id: 'round-1',
        step: 'confirm' as const,
        participantId: 'participant-1',
        participantName: 'Ada',
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
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-29T10:05:00.000Z',
      },
    })

    expect(nextState.participants[0]?.isUsed).toBe(true)
    expect(nextState.presentations[0]?.isUsed).toBe(true)
    expect(nextState.history).toHaveLength(1)
    expect(nextState.currentRound).toMatchObject({
      step: 'complete',
      historyEntryId: 'history-1',
    })
  })

  it('undoes the last round and returns both entities to the available pool', () => {
    const initialState = {
      ...createInitialAppState(),
      activeView: 'history' as const,
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
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
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
      currentRound: {
        id: 'round-1',
        step: 'complete' as const,
        participantId: 'participant-1',
        participantName: 'Ada',
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
    expect(nextState.participants[0]?.isUsed).toBe(false)
    expect(nextState.presentations[0]?.isUsed).toBe(false)
    expect(nextState.currentRound).toBeNull()
    expect(nextState.activeView).toBe('history')
  })

  it('resets round progress while keeping participants and presentations', () => {
    const initialState = {
      ...createInitialAppState(),
      activeView: 'history' as const,
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
          isActive: false,
          isUsed: true,
        },
      ],
      presentations: [
        {
          id: 'presentation-1',
          title: 'Romfart',
          url: 'https://example.com/romfart',
          isActive: false,
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
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
      currentRound: {
        id: 'round-1',
        step: 'participant' as const,
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: null,
        presentationTitle: null,
        presentationUrl: null,
        historyEntryId: null,
        startedAt: '2026-07-30T10:00:00.000Z',
      },
    }

    const nextState = appReducer(initialState, {
      type: 'resetEventProgress',
    })

    expect(nextState.history).toHaveLength(0)
    expect(nextState.currentRound).toBeNull()
    expect(nextState.participants[0]).toMatchObject({
      isActive: false,
      isUsed: false,
    })
    expect(nextState.presentations[0]).toMatchObject({
      isActive: false,
      isUsed: false,
    })
    expect(nextState.activeView).toBe('history')
  })

  it('can clear all application data completely', () => {
    const initialState = {
      ...createInitialAppState(),
      activeView: 'history' as const,
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
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
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
      currentRound: {
        id: 'round-1',
        step: 'complete' as const,
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        historyEntryId: 'history-1',
        startedAt: '2026-07-30T10:00:00.000Z',
      },
    }

    const nextState = appReducer(initialState, {
      type: 'clearAllData',
    })

    expect(nextState).toEqual(createInitialAppState())
  })
})
