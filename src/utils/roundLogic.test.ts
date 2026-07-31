import { describe, expect, it } from 'vitest'

import {
  cancelPenaltySelection,
  createHistoryEntryFromRound,
  createHistoryEntryWithPenalty,
  createParticipantRoundSelection,
  createPenaltyRoundSelection,
  createPresentationRoundSelection,
  createTeammateRoundSelection,
  getAvailableParticipants,
  getAvailablePenalties,
  getAvailablePresentations,
  getAvailableTeammates,
  moveRoundBackToPresentation,
  moveRoundBackToParticipant,
  moveRoundToConfirm,
  moveRoundToPenaltySelection,
  moveRoundToTeammateSelection,
  moveRoundToPresentation,
  reconcileCurrentRound,
  removeTeammateFromRound,
  selectAvailableParticipant,
  selectAvailablePenalty,
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
  it('selects only active and unused candidates for participants, teammates, presentations and penalties', () => {
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
    const penalties = [
      {
        id: 'penalty-1',
        title: 'Syng en sang',
        description: null,
        isActive: true,
        isUsed: false,
        createdAt: '2026-07-30T10:00:00.000Z',
      },
      {
        id: 'penalty-2',
        title: 'Used penalty',
        description: null,
        isActive: true,
        isUsed: true,
        createdAt: '2026-07-30T10:01:00.000Z',
      },
    ]

    expect(getAvailableParticipants(participants)).toEqual([participants[0], participants[1]])
    expect(getAvailableTeammates(participants, 'a')).toEqual([participants[1]])
    expect(getAvailablePresentations(presentations)).toEqual([presentations[0]])
    expect(getAvailablePenalties(penalties)).toEqual([penalties[0]])
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
    expect(selectAvailablePenalty(penalties, new QueueRandomSource([0]))).toEqual({
      success: true,
      data: penalties[0],
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
    expect(selectAvailablePenalty([], new QueueRandomSource([0]))).toEqual({
      success: false,
      errors: ['Det finnes ingen tilgjengelige straffer igjen.'],
    })
  })

  it('keeps participant, teammate, presentation and penalty selections temporary until they are confirmed', () => {
    const participant = { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }
    const teammate = { id: 'participant-2', name: 'Bjarne', isActive: true, isUsed: false }
    const presentation = {
      id: 'presentation-1',
      title: 'Romfart',
      url: 'https://example.com/romfart',
      isActive: true,
      isUsed: false,
    }
    const penalty = {
      id: 'penalty-1',
      title: 'Syng en sang',
      description: 'Velg en kjent sang.',
      isActive: true,
      isUsed: false,
      createdAt: '2026-07-30T10:00:00.000Z',
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
    const historyEntry = createHistoryEntryFromRound(
      confirmRound,
      0,
      'history-1',
      '2026-07-29T09:10:00.000Z',
    )
    const penaltyStep = moveRoundToPenaltySelection({
      ...confirmRound!,
      step: 'complete',
      historyEntryId: 'history-1',
    })
    const selectedPenaltyRound = createPenaltyRoundSelection(penaltyStep, penalty)
    const cancelledPenaltyRound = cancelPenaltySelection(selectedPenaltyRound)
    const resetToPresentation = moveRoundBackToPresentation(confirmRound)
    const resetToParticipant = moveRoundBackToParticipant(confirmRound)
    const removeTeammateRound = removeTeammateFromRound(selectedTeammateRound)

    expect(participant.isUsed).toBe(false)
    expect(teammate.isUsed).toBe(false)
    expect(presentation.isUsed).toBe(false)
    expect(penalty.isUsed).toBe(false)
    expect(historyEntry).toEqual({
      success: true,
      data: expect.objectContaining({
        penaltyId: null,
      }),
    })
    expect(selectedPenaltyRound).toMatchObject({
      step: 'penalty',
      penaltyId: 'penalty-1',
      penaltyTitle: 'Syng en sang',
    })
    expect(cancelledPenaltyRound).toMatchObject({
      step: 'complete',
      penaltyId: null,
      penaltyTitle: null,
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

  it('prevents selecting the main participant as their own teammate and attaching more than one penalty to a round', () => {
    const primary = { id: 'participant-1', name: 'Ada', isActive: true, isUsed: false }
    const teammate = { id: 'participant-2', name: 'Bjarne', isActive: true, isUsed: false }
    const penalty = {
      id: 'penalty-1',
      title: 'Syng en sang',
      description: null,
      isActive: true,
      isUsed: false,
      createdAt: '2026-07-30T10:00:00.000Z',
    }
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

    expect(
      createHistoryEntryWithPenalty(
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
          penaltyId: 'penalty-2',
          penaltyTitle: 'Eksisterende straff',
          penaltyDescription: null,
          completedAt: '2026-07-30T10:05:00.000Z',
        },
        penalty,
      ),
    ).toEqual({
      success: false,
      errors: ['Runden har allerede en bekreftet straff.'],
    })
  })

  it('creates history entries with optional penalties only when the round has the required selections', () => {
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
      penaltyId: null,
      penaltyTitle: null,
      penaltyDescription: null,
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
        penaltyId: null,
        penaltyTitle: null,
        penaltyDescription: null,
        completedAt: '2026-07-29T09:03:00.000Z',
      },
    })
  })

  it('resets or rewinds unfinished rounds and active penalty selections when selected items disappear or deactivate', () => {
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
      penaltyId: null,
      penaltyTitle: null,
      penaltyDescription: null,
      historyEntryId: null,
      startedAt: '2026-07-29T09:00:00.000Z',
    }

    const participantMissing = reconcileCurrentRound(currentRound, [], [], [], [])
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
      [],
    )
    const penaltyMissing = reconcileCurrentRound(
      {
        id: 'round-1',
        step: 'penalty' as const,
        primaryParticipantId: 'participant-1',
        primaryParticipantName: 'Ada',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: 'presentation-1',
        presentationTitle: 'Romfart',
        presentationUrl: 'https://example.com/romfart',
        penaltyId: 'penalty-1',
        penaltyTitle: 'Syng en sang',
        penaltyDescription: null,
        historyEntryId: 'history-1',
        startedAt: '2026-07-29T09:00:00.000Z',
      },
      [],
      [],
      [],
      [
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
          penaltyId: null,
          penaltyTitle: null,
          penaltyDescription: null,
          completedAt: '2026-07-30T10:05:00.000Z',
        },
      ],
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
    expect(penaltyMissing).toMatchObject({
      step: 'penalty',
      penaltyId: null,
      penaltyTitle: null,
    })
  })
})
