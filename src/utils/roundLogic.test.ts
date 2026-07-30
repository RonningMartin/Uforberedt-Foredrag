import { describe, expect, it } from 'vitest'

import {
  createHistoryEntryFromRound,
  createParticipantRoundSelection,
  createTeammateRoundSelection,
  createPresentationRoundSelection,
  getAvailableParticipants,
  getAvailablePresentations,
  getAvailableTeammates,
  moveRoundBackToPresentation,
  moveRoundBackToParticipant,
  moveRoundToConfirm,
  moveRoundToTeammateSelection,
  moveRoundToPresentation,
  removeTeammateFromRound,
  reconcileCurrentRound,
  selectAvailableParticipant,
  selectAvailablePresentation,
  selectAvailableTeammate,
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
  it('selects only active and unused candidates for participants, teammates and presentations', () => {
    const participants = [
      { id: 'a', name: 'Ada', isActive: true, isUsed: false },
      { id: 'b', name: 'Bjarne', isActive: true, isUsed: false },
      { id: 'c', name: 'Used', isActive: true, isUsed: true },
      { id: 'd', name: 'Inactive', isActive: false, isUsed: false },
    ]
    const presentations = [
      { id: 'p1', title: 'Rom', url: 'https://example.com/rom', isActive: true, isUsed: false },
      { id: 'p2', title: 'Used', url: 'https://example.com/used', isActive: true, isUsed: true },
    ]

    expect(getAvailableParticipants(participants)).toEqual([
      participants[0],
      participants[1],
    ])
    expect(getAvailableTeammates(participants, 'a')).toEqual([participants[1]])
    expect(getAvailablePresentations(presentations)).toHaveLength(1)
    expect(selectAvailableParticipant(participants, new QueueRandomSource([0]))).toEqual({
      success: true,
      data: participants[0],
    })
    expect(selectAvailableTeammate(participants, 'a', new QueueRandomSource([0]))).toEqual({
      success: true,
      data: participants[1],
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
    expect(selectAvailableTeammate([], 'participant-1', new QueueRandomSource([0]))).toEqual({
      success: false,
      errors: ['Det finnes ingen tilgjengelige lagkamerater igjen.'],
    })
    expect(selectAvailablePresentation([], new QueueRandomSource([0]))).toEqual({
      success: false,
      errors: ['Det finnes ingen tilgjengelige presentasjoner igjen.'],
    })
  })

  it('keeps selections temporary until the round is confirmed', () => {
    const participant = { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }
    const teammate = { id: 'participant-2', name: 'Bjarne', isActive: true, isUsed: false }
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
    const teammateRound = moveRoundToTeammateSelection(participantRound)
    const selectedTeammateRound = createTeammateRoundSelection(teammateRound, teammate)
    const presentationRound = moveRoundToPresentation(selectedTeammateRound)
    const selectedPresentationRound = createPresentationRoundSelection(presentationRound, presentation)
    const confirmRound = moveRoundToConfirm(selectedPresentationRound)
    const resetToPresentation = moveRoundBackToPresentation(confirmRound)
    const resetToParticipant = moveRoundBackToParticipant(confirmRound)
    const removeTeammateRound = removeTeammateFromRound(selectedTeammateRound)

    expect(participant.isUsed).toBe(false)
    expect(teammate.isUsed).toBe(false)
    expect(presentation.isUsed).toBe(false)
    expect(selectedTeammateRound).toMatchObject({
      step: 'teammate',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
    })
    expect(selectedPresentationRound).toMatchObject({
      step: 'presentation',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
      presentationId: 'presentation-1',
    })
    expect(confirmRound).toMatchObject({
      step: 'confirm',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
      presentationId: 'presentation-1',
    })
    expect(resetToPresentation).toMatchObject({
      step: 'presentation',
      teammateParticipantId: 'participant-2',
      presentationId: 'presentation-1',
    })
    expect(resetToParticipant).toMatchObject({
      step: 'teammate',
      teammateParticipantId: 'participant-2',
      presentationId: null,
    })
    expect(removeTeammateRound).toMatchObject({
      step: 'participant',
      teammateParticipantId: null,
      presentationId: null,
    })
  })

  it('prevents selecting the main participant as their own teammate and handles a single teammate candidate', () => {
    const primary = { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }
    const teammate = { id: 'participant-2', name: 'Bjarne', isActive: true, isUsed: false }
    const currentRound = createParticipantRoundSelection(
      null,
      primary,
      'round-1',
      '2026-07-29T09:00:00.000Z',
    )
    const teammateSelection = moveRoundToTeammateSelection(currentRound)

    expect(createTeammateRoundSelection(teammateSelection, primary)).toBeNull()
    expect(selectAvailableTeammate([primary, teammate], primary.id, new QueueRandomSource([0]))).toEqual({
      success: true,
      data: teammate,
    })
  })

  it('creates a history entry only when the round has the required selections', () => {
    const draftRound = {
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
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: 'participant-2',
        teammateParticipantName: 'Bjarne',
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
      primaryParticipantId: 'participant-1',
      primaryParticipantName: 'Ada',
      teammateParticipantId: 'participant-2',
      teammateParticipantName: 'Bjarne',
      presentationId: 'presentation-1',
      presentationTitle: 'Romfart',
      presentationUrl: 'https://example.com/romfart',
      historyEntryId: null,
      startedAt: '2026-07-29T09:00:00.000Z',
    }

    const participantMissing = reconcileCurrentRound(currentRound, [], [], [])
    const teammateMissing = reconcileCurrentRound(
      currentRound,
      [{ id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }],
      [
        {
          id: 'presentation-1',
          title: 'Romfart',
          url: 'https://example.com/romfart',
          isActive: true,
          isUsed: false,
        },
      ],
      [],
    )
    const presentationMissing = reconcileCurrentRound(
      currentRound,
      [
        { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false },
        { id: 'participant-2', name: 'Bjarne', isActive: true, isUsed: false },
      ],
      [],
      [],
    )

    expect(participantMissing).toBeNull()
    expect(teammateMissing).toMatchObject({
      step: 'participant',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: null,
    })
    expect(presentationMissing).toMatchObject({
      step: 'presentation',
      primaryParticipantId: 'participant-1',
      teammateParticipantId: 'participant-2',
      presentationId: null,
    })
  })
})
