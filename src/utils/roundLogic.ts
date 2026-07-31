import type { ValidationResult } from '../types/app'
import type {
  DraftRound,
  Participant,
  Penalty,
  Presentation,
  RoundHistoryEntry,
} from '../types/domain'
import { selectSecureRandomItem, type RandomSource } from './secureRandom'

export function getAvailableParticipants(participants: readonly Participant[]): Participant[] {
  return participants.filter((participant) => participant.isActive && !participant.isUsed)
}

export function getAvailableTeammates(
  participants: readonly Participant[],
  primaryParticipantId: string | null,
): Participant[] {
  return getAvailableParticipants(participants).filter(
    (participant) => participant.id !== primaryParticipantId,
  )
}

export function getAvailablePresentations(
  presentations: readonly Presentation[],
): Presentation[] {
  return presentations.filter((presentation) => presentation.isActive && !presentation.isUsed)
}

export function getAvailablePenalties(penalties: readonly Penalty[]): Penalty[] {
  return penalties.filter((penalty) => penalty.isActive && !penalty.isUsed)
}

export function selectAvailableParticipant(
  participants: readonly Participant[],
  randomSource?: RandomSource,
): ValidationResult<Participant> {
  const availableParticipants = getAvailableParticipants(participants)

  if (availableParticipants.length === 0) {
    return failure('Det finnes ingen tilgjengelige deltakere igjen.')
  }

  return success(selectSecureRandomItem(availableParticipants, randomSource).item)
}

export function selectAvailableTeammate(
  participants: readonly Participant[],
  primaryParticipantId: string | null,
  randomSource?: RandomSource,
): ValidationResult<Participant> {
  const availableTeammates = getAvailableTeammates(participants, primaryParticipantId)

  if (availableTeammates.length === 0) {
    return failure('Det finnes ingen tilgjengelige lagkamerater igjen.')
  }

  return success(selectSecureRandomItem(availableTeammates, randomSource).item)
}

export function selectAvailablePresentation(
  presentations: readonly Presentation[],
  randomSource?: RandomSource,
): ValidationResult<Presentation> {
  const availablePresentations = getAvailablePresentations(presentations)

  if (availablePresentations.length === 0) {
    return failure('Det finnes ingen tilgjengelige presentasjoner igjen.')
  }

  return success(selectSecureRandomItem(availablePresentations, randomSource).item)
}

export function selectAvailablePenalty(
  penalties: readonly Penalty[],
  randomSource?: RandomSource,
): ValidationResult<Penalty> {
  const availablePenalties = getAvailablePenalties(penalties)

  if (availablePenalties.length === 0) {
    return failure('Det finnes ingen tilgjengelige straffer igjen.')
  }

  return success(selectSecureRandomItem(availablePenalties, randomSource).item)
}

export function createParticipantRoundSelection(
  currentRound: DraftRound | null,
  participant: Participant,
  roundId: string,
  startedAt: string,
): DraftRound {
  return {
    id: roundId,
    step: 'participant',
    primaryParticipantId: participant.id,
    primaryParticipantName: participant.name,
    teammateParticipantId: null,
    teammateParticipantName: null,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
    startedAt: currentRound?.step === 'complete' ? startedAt : currentRound?.startedAt ?? startedAt,
  }
}

export function moveRoundToTeammateSelection(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'teammate',
    teammateParticipantId: null,
    teammateParticipantName: null,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function moveRoundToPresentation(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function createPresentationRoundSelection(
  currentRound: DraftRound | null,
  presentation: Presentation,
): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    presentationId: presentation.id,
    presentationTitle: presentation.title,
    presentationUrl: presentation.url,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function moveRoundToConfirm(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null ||
    currentRound.presentationId === null ||
    currentRound.presentationTitle === null ||
    currentRound.presentationUrl === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'confirm',
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function createTeammateRoundSelection(
  currentRound: DraftRound | null,
  teammate: Participant,
): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null ||
    teammate.id === currentRound.primaryParticipantId
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'teammate',
    teammateParticipantId: teammate.id,
    teammateParticipantName: teammate.name,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function moveRoundBackToParticipant(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: currentRound.teammateParticipantId === null ? 'participant' : 'teammate',
    teammateParticipantId: currentRound.teammateParticipantId,
    teammateParticipantName: currentRound.teammateParticipantName,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function removeTeammateFromRound(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'participant',
    teammateParticipantId: null,
    teammateParticipantName: null,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function moveRoundBackToPresentation(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }
}

export function moveRoundToPenaltySelection(currentRound: DraftRound | null): DraftRound | null {
  if (currentRound === null || currentRound.historyEntryId === null) {
    return null
  }

  if (currentRound.penaltyId !== null) {
    return currentRound
  }

  return {
    ...currentRound,
    step: 'penalty',
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
  }
}

export function createPenaltyRoundSelection(
  currentRound: DraftRound | null,
  penalty: Penalty,
): DraftRound | null {
  if (currentRound === null || currentRound.historyEntryId === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'penalty',
    penaltyId: penalty.id,
    penaltyTitle: penalty.title,
    penaltyDescription: penalty.description,
  }
}

export function cancelPenaltySelection(currentRound: DraftRound | null): DraftRound | null {
  if (currentRound === null || currentRound.historyEntryId === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'complete',
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
  }
}

export function createHistoryEntryFromRound(
  currentRound: DraftRound | null,
  historyCount: number,
  historyEntryId: string,
  completedAt: string,
): ValidationResult<RoundHistoryEntry> {
  if (
    currentRound === null ||
    currentRound.primaryParticipantId === null ||
    currentRound.primaryParticipantName === null ||
    currentRound.presentationId === null ||
    currentRound.presentationTitle === null ||
    currentRound.presentationUrl === null
  ) {
    return failure('Runden mangler deltaker eller presentasjon og kan ikke bekreftes ennå.')
  }

  return success({
    id: historyEntryId,
    roundNumber: historyCount + 1,
    primaryParticipantId: currentRound.primaryParticipantId,
    primaryParticipantName: currentRound.primaryParticipantName,
    teammateParticipantId: currentRound.teammateParticipantId,
    teammateParticipantName: currentRound.teammateParticipantName,
    presentationId: currentRound.presentationId,
    presentationTitle: currentRound.presentationTitle,
    presentationUrl: currentRound.presentationUrl,
    penaltyId: currentRound.penaltyId,
    penaltyTitle: currentRound.penaltyTitle,
    penaltyDescription: currentRound.penaltyDescription,
    completedAt,
  })
}

export function createHistoryEntryWithPenalty(
  historyEntry: RoundHistoryEntry,
  penalty: Penalty,
): ValidationResult<RoundHistoryEntry> {
  if (historyEntry.penaltyId !== null) {
    return failure('Runden har allerede en bekreftet straff.')
  }

  return success({
    ...historyEntry,
    penaltyId: penalty.id,
    penaltyTitle: penalty.title,
    penaltyDescription: penalty.description,
  })
}

export function createCompletedRound(
  currentRound: DraftRound | null,
  historyEntry: RoundHistoryEntry,
): DraftRound | null {
  if (currentRound === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'complete',
    primaryParticipantId: historyEntry.primaryParticipantId,
    primaryParticipantName: historyEntry.primaryParticipantName,
    teammateParticipantId: historyEntry.teammateParticipantId,
    teammateParticipantName: historyEntry.teammateParticipantName,
    presentationId: historyEntry.presentationId,
    presentationTitle: historyEntry.presentationTitle,
    presentationUrl: historyEntry.presentationUrl,
    penaltyId: historyEntry.penaltyId,
    penaltyTitle: historyEntry.penaltyTitle,
    penaltyDescription: historyEntry.penaltyDescription,
    historyEntryId: historyEntry.id,
  }
}

export function reconcileCurrentRound(
  currentRound: DraftRound | null,
  participants: readonly Participant[],
  presentations: readonly Presentation[],
  penalties: readonly Penalty[],
  history: readonly RoundHistoryEntry[],
): DraftRound | null {
  if (currentRound === null) {
    return null
  }

  if (currentRound.step === 'complete' || currentRound.step === 'penalty') {
    if (currentRound.historyEntryId === null) {
      return null
    }

    const matchingHistoryEntry = history.find((entry) => entry.id === currentRound.historyEntryId)

    if (matchingHistoryEntry === undefined) {
      return null
    }

    if (currentRound.step === 'complete') {
      return syncRoundFromHistoryEntry(currentRound, matchingHistoryEntry, 'complete')
    }

    if (matchingHistoryEntry.penaltyId !== null) {
      return syncRoundFromHistoryEntry(currentRound, matchingHistoryEntry, 'complete')
    }

    if (currentRound.penaltyId === null) {
      return syncRoundFromHistoryEntry(currentRound, matchingHistoryEntry, 'penalty')
    }

    const selectedPenalty = penalties.find((candidate) => candidate.id === currentRound.penaltyId)

    if (
      selectedPenalty === undefined ||
      !selectedPenalty.isActive ||
      selectedPenalty.isUsed
    ) {
      return syncRoundFromHistoryEntry(currentRound, matchingHistoryEntry, 'penalty')
    }

    return {
      ...syncRoundFromHistoryEntry(currentRound, matchingHistoryEntry, 'penalty'),
      penaltyId: selectedPenalty.id,
      penaltyTitle: selectedPenalty.title,
      penaltyDescription: selectedPenalty.description,
    }
  }

  if (currentRound.primaryParticipantId === null) {
    return null
  }

  const primaryParticipant = participants.find(
    (candidate) => candidate.id === currentRound.primaryParticipantId,
  )

  if (primaryParticipant === undefined || !primaryParticipant.isActive || primaryParticipant.isUsed) {
    return null
  }

  const baseRound: DraftRound = {
    ...currentRound,
    primaryParticipantId: primaryParticipant.id,
    primaryParticipantName: primaryParticipant.name,
    penaltyId: null,
    penaltyTitle: null,
    penaltyDescription: null,
    historyEntryId: null,
  }

  if (currentRound.step === 'participant') {
    return {
      ...baseRound,
      step: 'participant',
      teammateParticipantId: null,
      teammateParticipantName: null,
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  if (currentRound.step === 'teammate') {
    if (currentRound.teammateParticipantId === null) {
      return {
        ...baseRound,
        step: 'teammate',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: null,
        presentationTitle: null,
        presentationUrl: null,
      }
    }

    const teammateParticipant = participants.find(
      (candidate) => candidate.id === currentRound.teammateParticipantId,
    )

    if (
      teammateParticipant === undefined ||
      !teammateParticipant.isActive ||
      teammateParticipant.isUsed ||
      teammateParticipant.id === primaryParticipant.id
    ) {
      return {
        ...baseRound,
        step: 'participant',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: null,
        presentationTitle: null,
        presentationUrl: null,
      }
    }

    return {
      ...baseRound,
      step: 'teammate',
      teammateParticipantId: teammateParticipant.id,
      teammateParticipantName: teammateParticipant.name,
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  let teammateParticipantId: string | null = null
  let teammateParticipantName: string | null = null

  if (currentRound.teammateParticipantId !== null) {
    const teammateParticipant = participants.find(
      (candidate) => candidate.id === currentRound.teammateParticipantId,
    )

    if (
      teammateParticipant === undefined ||
      !teammateParticipant.isActive ||
      teammateParticipant.isUsed ||
      teammateParticipant.id === primaryParticipant.id
    ) {
      return {
        ...baseRound,
        step: 'participant',
        teammateParticipantId: null,
        teammateParticipantName: null,
        presentationId: null,
        presentationTitle: null,
        presentationUrl: null,
      }
    }

    teammateParticipantId = teammateParticipant.id
    teammateParticipantName = teammateParticipant.name
  }

  if (currentRound.presentationId === null) {
    return {
      ...baseRound,
      step: 'presentation',
      teammateParticipantId,
      teammateParticipantName,
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  const presentation = presentations.find(
    (candidate) => candidate.id === currentRound.presentationId,
  )

  if (presentation === undefined || !presentation.isActive || presentation.isUsed) {
    return {
      ...baseRound,
      step: 'presentation',
      teammateParticipantId,
      teammateParticipantName,
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  return {
    ...baseRound,
    step: currentRound.step === 'confirm' ? 'confirm' : 'presentation',
    teammateParticipantId,
    teammateParticipantName,
    presentationId: presentation.id,
    presentationTitle: presentation.title,
    presentationUrl: presentation.url,
  }
}

function syncRoundFromHistoryEntry(
  currentRound: DraftRound,
  historyEntry: RoundHistoryEntry,
  step: 'complete' | 'penalty',
): DraftRound {
  return {
    ...currentRound,
    step,
    primaryParticipantId: historyEntry.primaryParticipantId,
    primaryParticipantName: historyEntry.primaryParticipantName,
    teammateParticipantId: historyEntry.teammateParticipantId,
    teammateParticipantName: historyEntry.teammateParticipantName,
    presentationId: historyEntry.presentationId,
    presentationTitle: historyEntry.presentationTitle,
    presentationUrl: historyEntry.presentationUrl,
    penaltyId: step === 'complete' ? historyEntry.penaltyId : null,
    penaltyTitle: step === 'complete' ? historyEntry.penaltyTitle : null,
    penaltyDescription: step === 'complete' ? historyEntry.penaltyDescription : null,
    historyEntryId: historyEntry.id,
  }
}

function success<T>(data: T): ValidationResult<T> {
  return {
    success: true,
    data,
  }
}

function failure<T = never>(...errors: string[]): ValidationResult<T> {
  return {
    success: false,
    errors,
  }
}
