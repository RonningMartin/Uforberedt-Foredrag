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
        presentationId: 'presentation-1',
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
    expect(afterPresentationDelete.currentRound).toBeNull()
  })
})
