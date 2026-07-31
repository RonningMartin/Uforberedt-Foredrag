import { describe, expect, it } from 'vitest'

import { createInitialAppState } from './appState'
import { appReducer } from './appReducer'

describe('appReducer', () => {
  it('adds and updates participants, presentations and penalties', () => {
    const participant = createParticipant('participant-1', 'Ada')
    const presentation = createPresentation('presentation-1', 'Romfart')
    const penalty = createPenalty('penalty-1', 'Syng en sang')

    const initialState = createInitialAppState()
    const participantState = appReducer(initialState, {
      type: 'addParticipant',
      participant,
    })
    const presentationState = appReducer(participantState, {
      type: 'addPresentation',
      presentation,
    })
    const penaltyState = appReducer(presentationState, {
      type: 'addPenalty',
      penalty,
    })
    const updatedParticipantState = appReducer(penaltyState, {
      type: 'updateParticipant',
      participantId: participant.id,
      name: 'Ada Lovelace',
    })
    const updatedPresentationState = appReducer(updatedParticipantState, {
      type: 'updatePresentation',
      presentationId: presentation.id,
      title: 'Romfart og stjerner',
      url: 'https://example.com/stjerner',
    })
    const finalState = appReducer(updatedPresentationState, {
      type: 'updatePenalty',
      penaltyId: penalty.id,
      title: 'Syng et refreng',
      description: 'Velg en kjent sang.',
    })

    expect(finalState.participants[0]?.name).toBe('Ada Lovelace')
    expect(finalState.presentations[0]).toMatchObject({
      title: 'Romfart og stjerner',
      url: 'https://example.com/stjerner',
    })
    expect(finalState.penalties[0]).toMatchObject({
      title: 'Syng et refreng',
      description: 'Velg en kjent sang.',
    })
  })

  it('restores used entities and can toggle active state for all collections', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [createParticipant('participant-1', 'Ada', { isActive: false, isUsed: true })],
      presentations: [
        createPresentation('presentation-1', 'Romfart', {
          isActive: false,
          isUsed: true,
        }),
      ],
      penalties: [
        createPenalty('penalty-1', 'Syng en sang', {
          isActive: false,
          isUsed: true,
        }),
      ],
    }

    const restoredParticipants = appReducer(initialState, {
      type: 'restoreParticipant',
      participantId: 'participant-1',
    })
    const restoredPresentations = appReducer(restoredParticipants, {
      type: 'restorePresentation',
      presentationId: 'presentation-1',
    })
    const restoredAll = appReducer(restoredPresentations, {
      type: 'restorePenalty',
      penaltyId: 'penalty-1',
    })
    const toggledState = appReducer(restoredAll, {
      type: 'setPenaltyActive',
      penaltyId: 'penalty-1',
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
    expect(restoredAll.penalties[0]).toMatchObject({
      isActive: true,
      isUsed: false,
    })
    expect(toggledState.penalties[0]?.isActive).toBe(false)
  })

  it('reconciles unfinished rounds when referenced entities are deleted', () => {
    const initialState = {
      ...createInitialAppState(),
      participants: [
        createParticipant('participant-1', 'Ada'),
        createParticipant('participant-2', 'Bjarne'),
      ],
      presentations: [createPresentation('presentation-1', 'Romfart')],
      penalties: [createPenalty('penalty-1', 'Syng en sang')],
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
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
      penalties: [createPenalty('penalty-1', 'Syng en sang')],
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
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
      penaltyId: null,
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
      penalties: [createPenalty('penalty-1', 'Syng en sang')],
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
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

  it('attaches a confirmed penalty to the correct round and restores it on undo', () => {
    const initialState = {
      ...createInitialAppState(),
      activeView: 'history' as const,
      participants: [
        createParticipant('participant-1', 'Ada', { isUsed: true }),
        createParticipant('participant-2', 'Bjarne', { isUsed: true }),
      ],
      presentations: [createPresentation('presentation-1', 'Romfart', { isUsed: true })],
      penalties: [createPenalty('penalty-1', 'Syng en sang')],
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
          penaltyId: null,
          penaltyTitle: null,
          penaltyDescription: null,
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
      currentRound: {
        id: 'round-1',
        step: 'penalty' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        penaltyId: 'penalty-1',
        penaltyTitle: 'Syng en sang',
        penaltyDescription: null,
        historyEntryId: 'history-1',
        startedAt: '2026-07-30T10:00:00.000Z',
      },
    }

    const confirmedPenaltyState = appReducer(initialState, {
      type: 'confirmRoundPenalty',
      historyEntry: {
        ...initialState.history[0],
        penaltyId: 'penalty-1',
        penaltyTitle: 'Syng en sang',
        penaltyDescription: null,
      },
    })

    expect(confirmedPenaltyState.penalties[0]).toMatchObject({
      isUsed: true,
    })
    expect(confirmedPenaltyState.history[0]).toMatchObject({
      penaltyId: 'penalty-1',
      penaltyTitle: 'Syng en sang',
    })
    expect(confirmedPenaltyState.currentRound).toMatchObject({
      step: 'complete',
      penaltyId: 'penalty-1',
    })

    const undoneState = appReducer(confirmedPenaltyState, {
      type: 'undoLastRound',
    })

    expect(undoneState.history).toHaveLength(0)
    expect(undoneState.participants.every((participant) => participant.isUsed === false)).toBe(true)
    expect(undoneState.presentations[0]?.isUsed).toBe(false)
    expect(undoneState.penalties[0]?.isUsed).toBe(false)
    expect(undoneState.currentRound).toBeNull()
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

function createPenalty(
  id: string,
  title: string,
  overrides?: Partial<{
    description: string | null
    isActive: boolean
    isUsed: boolean
    createdAt: string
  }>,
) {
  return {
    id,
    title,
    description: overrides?.description ?? null,
    isActive: overrides?.isActive ?? true,
    isUsed: overrides?.isUsed ?? false,
    createdAt: overrides?.createdAt ?? '2026-07-30T09:00:00.000Z',
  }
}
