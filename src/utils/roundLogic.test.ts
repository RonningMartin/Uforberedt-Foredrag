import { describe, expect, it } from 'vitest'

import {
  createHistoryEntryFromRound,
  createParticipantRoundSelection,
  createPresentationRoundSelection,
  getAvailableParticipants,
  getAvailablePresentations,
  moveRoundBackToPresentation,
  moveRoundBackToParticipant,
  moveRoundToConfirm,
  moveRoundToPresentation,
  reconcileCurrentRound,
  selectAvailableParticipant,
  selectAvailablePresentation,
} from './roundLogic'
import type { RandomSource } from './secureRandom'

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

describe('roundLogic', () => {
  it('selects only active and unused candidates', () => {
    const participants = [
      { id: 'a', name: 'Ada', isActive: true, isUsed: false },
      { id: 'b', name: 'Used', isActive: true, isUsed: true },
      { id: 'c', name: 'Inactive', isActive: false, isUsed: false },
    ]
    const presentations = [
      { id: 'p1', title: 'Rom', url: 'https://example.com/rom', isActive: true, isUsed: false },
      { id: 'p2', title: 'Used', url: 'https://example.com/used', isActive: true, isUsed: true },
    ]

    expect(getAvailableParticipants(participants)).toHaveLength(1)
    expect(getAvailablePresentations(presentations)).toHaveLength(1)
    expect(selectAvailableParticipant(participants, new QueueRandomSource([0]))).toEqual({
      success: true,
      data: participants[0],
    })
    expect(selectAvailablePresentation(presentations, new QueueRandomSource([0]))).toEqual({
      success: true,
      data: presentations[0],
    })
  })

  it('fails safely when no candidates remain', () => {
    expect(selectAvailableParticipant([], new QueueRandomSource([0]))).toEqual({
      success: false,
      errors: ['Det finnes ingen tilgjengelige deltakere igjen.'],
    })
    expect(selectAvailablePresentation([], new QueueRandomSource([0]))).toEqual({
      success: false,
      errors: ['Det finnes ingen tilgjengelige presentasjoner igjen.'],
    })
  })

  it('keeps selections temporary until the round is confirmed', () => {
    const participant = { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }
    const presentation = {
      id: 'presentation-1',
      title: 'Romfart',
      url: 'https://example.com/romfart',
      isActive: true,
      isUsed: false,
    }

    const participantRound = createParticipantRoundSelection(
      null,
      participant,
      'round-1',
      '2026-07-29T09:00:00.000Z',
    )
    const presentationRound = moveRoundToPresentation(participantRound)
    const selectedPresentationRound = createPresentationRoundSelection(presentationRound, presentation)
    const confirmRound = moveRoundToConfirm(selectedPresentationRound)
    const resetToPresentation = moveRoundBackToPresentation(confirmRound)
    const resetToParticipant = moveRoundBackToParticipant(confirmRound)

    expect(participant.isUsed).toBe(false)
    expect(presentation.isUsed).toBe(false)
    expect(selectedPresentationRound).toMatchObject({
      step: 'presentation',
      participantId: 'participant-1',
      presentationId: 'presentation-1',
    })
    expect(confirmRound).toMatchObject({
      step: 'confirm',
      participantId: 'participant-1',
      presentationId: 'presentation-1',
    })
    expect(resetToPresentation).toMatchObject({
      step: 'presentation',
      presentationId: 'presentation-1',
    })
    expect(resetToParticipant).toMatchObject({
      step: 'participant',
      presentationId: null,
    })
  })

  it('creates a history entry only when both selections are present', () => {
    const draftRound = {
      id: 'round-1',
      step: 'confirm' as const,
      participantId: 'participant-1',
      participantName: 'Ada',
      presentationId: 'presentation-1',
      presentationTitle: 'Romfart',
      presentationUrl: 'https://example.com/romfart',
      historyEntryId: null,
      startedAt: '2026-07-29T09:00:00.000Z',
    }

    const result = createHistoryEntryFromRound(
      draftRound,
      2,
      'history-3',
      '2026-07-29T09:03:00.000Z',
    )

    expect(result).toEqual({
      success: true,
      data: {
        id: 'history-3',
        roundNumber: 3,
        participantId: 'participant-1',
        participantName: 'Ada',
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        completedAt: '2026-07-29T09:03:00.000Z',
      },
    })
  })

  it('resets or rewinds unfinished rounds when selected items disappear or deactivate', () => {
    const currentRound = {
      id: 'round-1',
      step: 'confirm' as const,
      participantId: 'participant-1',
      participantName: 'Ada',
      presentationId: 'presentation-1',
      presentationTitle: 'Romfart',
      presentationUrl: 'https://example.com/romfart',
      historyEntryId: null,
      startedAt: '2026-07-29T09:00:00.000Z',
    }

    const participantMissing = reconcileCurrentRound(currentRound, [], [], [])
    const presentationMissing = reconcileCurrentRound(
      currentRound,
      [{ id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }],
      [],
      [],
    )

    expect(participantMissing).toBeNull()
    expect(presentationMissing).toMatchObject({
      step: 'presentation',
      participantId: 'participant-1',
      presentationId: null,
    })
  })
})
