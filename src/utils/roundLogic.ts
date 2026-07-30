import type { ValidationResult } from '../types/app'
import type {
  DraftRound,
  Participant,
  Presentation,
  RoundHistoryEntry,
} from '../types/domain'
import { selectSecureRandomItem, type RandomSource } from './secureRandom'

export function getAvailableParticipants(participants: readonly Participant[]): Participant[] {
  return participants.filter((participant) => participant.isActive && !participant.isUsed)
}

export function getAvailablePresentations(
  presentations: readonly Presentation[],
): Presentation[] {
  return presentations.filter((presentation) => presentation.isActive && !presentation.isUsed)
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

export function createParticipantRoundSelection(
  currentRound: DraftRound | null,
  participant: Participant,
  roundId: string,
  startedAt: string,
): DraftRound {
  return {
    id: roundId,
    step: 'participant',
    participantId: participant.id,
    participantName: participant.name,
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    historyEntryId: null,
    startedAt: currentRound?.step === 'complete' ? startedAt : currentRound?.startedAt ?? startedAt,
  }
}

export function moveRoundToPresentation(currentRound: DraftRound | null): DraftRound | null {
  if (currentRound === null || currentRound.participantId === null || currentRound.participantName === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    historyEntryId: null,
  }
}

export function createPresentationRoundSelection(
  currentRound: DraftRound | null,
  presentation: Presentation,
): DraftRound | null {
  if (currentRound === null || currentRound.participantId === null || currentRound.participantName === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    presentationId: presentation.id,
    presentationTitle: presentation.title,
    presentationUrl: presentation.url,
    historyEntryId: null,
  }
}

export function moveRoundToConfirm(currentRound: DraftRound | null): DraftRound | null {
  if (
    currentRound === null ||
    currentRound.participantId === null ||
    currentRound.participantName === null ||
    currentRound.presentationId === null ||
    currentRound.presentationTitle === null ||
    currentRound.presentationUrl === null
  ) {
    return null
  }

  return {
    ...currentRound,
    step: 'confirm',
    historyEntryId: null,
  }
}

export function moveRoundBackToParticipant(currentRound: DraftRound | null): DraftRound | null {
  if (currentRound === null || currentRound.participantId === null || currentRound.participantName === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'participant',
    presentationId: null,
    presentationTitle: null,
    presentationUrl: null,
    historyEntryId: null,
  }
}

export function moveRoundBackToPresentation(currentRound: DraftRound | null): DraftRound | null {
  if (currentRound === null || currentRound.participantId === null || currentRound.participantName === null) {
    return null
  }

  return {
    ...currentRound,
    step: 'presentation',
    historyEntryId: null,
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
    currentRound.participantId === null ||
    currentRound.participantName === null ||
    currentRound.presentationId === null ||
    currentRound.presentationTitle === null ||
    currentRound.presentationUrl === null
  ) {
    return failure('Runden mangler deltaker eller presentasjon og kan ikke bekreftes ennå.')
  }

  return success({
    id: historyEntryId,
    roundNumber: historyCount + 1,
    participantId: currentRound.participantId,
    participantName: currentRound.participantName,
    presentationId: currentRound.presentationId,
    presentationTitle: currentRound.presentationTitle,
    presentationUrl: currentRound.presentationUrl,
    completedAt,
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
    participantId: historyEntry.participantId,
    participantName: historyEntry.participantName,
    presentationId: historyEntry.presentationId,
    presentationTitle: historyEntry.presentationTitle,
    presentationUrl: historyEntry.presentationUrl,
    historyEntryId: historyEntry.id,
  }
}

export function reconcileCurrentRound(
  currentRound: DraftRound | null,
  participants: readonly Participant[],
  presentations: readonly Presentation[],
  history: readonly RoundHistoryEntry[],
): DraftRound | null {
  if (currentRound === null) {
    return null
  }

  if (currentRound.step === 'complete') {
    if (currentRound.historyEntryId === null) {
      return null
    }

    const matchingHistoryEntry = history.find((entry) => entry.id === currentRound.historyEntryId)

    if (matchingHistoryEntry === undefined) {
      return null
    }

    return {
      ...currentRound,
      participantId: matchingHistoryEntry.participantId,
      participantName: matchingHistoryEntry.participantName,
      presentationId: matchingHistoryEntry.presentationId,
      presentationTitle: matchingHistoryEntry.presentationTitle,
      presentationUrl: matchingHistoryEntry.presentationUrl,
    }
  }

  if (currentRound.participantId === null) {
    return null
  }

  const participant = participants.find((candidate) => candidate.id === currentRound.participantId)

  if (participant === undefined || !participant.isActive || participant.isUsed) {
    return null
  }

  const baseRound: DraftRound = {
    ...currentRound,
    participantId: participant.id,
    participantName: participant.name,
    historyEntryId: null,
  }

  if (currentRound.step === 'participant') {
    return {
      ...baseRound,
      step: 'participant',
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  if (currentRound.presentationId === null) {
    return {
      ...baseRound,
      step: 'presentation',
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
      presentationId: null,
      presentationTitle: null,
      presentationUrl: null,
    }
  }

  return {
    ...baseRound,
    step: currentRound.step === 'confirm' ? 'confirm' : 'presentation',
    presentationId: presentation.id,
    presentationTitle: presentation.title,
    presentationUrl: presentation.url,
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
