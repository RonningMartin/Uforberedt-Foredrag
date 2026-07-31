import type { AppAction, AppState } from '../types/app'
import { createInitialAppState } from './appState'
import { createCompletedRound, reconcileCurrentRound } from '../utils/roundLogic'

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'navigate':
      if (state.activeView === action.view) {
        return state
      }

      return {
        ...state,
        activeView: action.view,
      }

    case 'setCurrentRound':
      return {
        ...state,
        currentRound: action.currentRound,
      }

    case 'confirmCurrentRound': {
      const participantIds = getUniqueParticipantIds(
        action.historyEntry.primaryParticipantId,
        action.historyEntry.teammateParticipantId,
      )
      const participants = state.participants.map((participant) =>
        participantIds.has(participant.id)
          ? {
              ...participant,
              isUsed: true,
            }
          : participant,
      )
      const presentations = state.presentations.map((presentation) =>
        presentation.id === action.historyEntry.presentationId
          ? {
              ...presentation,
              isUsed: true,
            }
          : presentation,
      )

      return {
        ...state,
        participants,
        presentations,
        history: [...state.history, action.historyEntry],
        currentRound: createCompletedRound(state.currentRound, action.historyEntry),
      }
    }

    case 'confirmRoundPenalty': {
      const existingHistoryEntry = state.history.find((entry) => entry.id === action.historyEntry.id)

      if (existingHistoryEntry === undefined || existingHistoryEntry.penaltyId !== null) {
        return state
      }

      return withReconciledRound({
        ...state,
        penalties: state.penalties.map((penalty) =>
          penalty.id === action.historyEntry.penaltyId
            ? {
                ...penalty,
                isUsed: true,
              }
            : penalty,
        ),
        history: state.history.map((entry) =>
          entry.id === action.historyEntry.id ? action.historyEntry : entry,
        ),
        currentRound: createCompletedRound(state.currentRound, action.historyEntry),
      })
    }

    case 'undoLastRound': {
      const lastHistoryEntry = state.history.at(-1)

      if (lastHistoryEntry === undefined) {
        return state
      }

      const participantIds = getUniqueParticipantIds(
        lastHistoryEntry.primaryParticipantId,
        lastHistoryEntry.teammateParticipantId,
      )

      return withReconciledRound({
        ...state,
        participants: state.participants.map((participant) =>
          participantIds.has(participant.id)
            ? {
                ...participant,
                isUsed: false,
              }
            : participant,
        ),
        presentations: state.presentations.map((presentation) =>
          presentation.id === lastHistoryEntry.presentationId
            ? {
                ...presentation,
                isUsed: false,
              }
            : presentation,
        ),
        penalties: state.penalties.map((penalty) =>
          penalty.id === lastHistoryEntry.penaltyId
            ? {
                ...penalty,
                isUsed: false,
              }
            : penalty,
        ),
        history: state.history.slice(0, -1),
      })
    }

    case 'resetEventProgress':
      return withReconciledRound({
        ...state,
        participants: state.participants.map((participant) => ({
          ...participant,
          isUsed: false,
        })),
        presentations: state.presentations.map((presentation) => ({
          ...presentation,
          isUsed: false,
        })),
        penalties: state.penalties.map((penalty) => ({
          ...penalty,
          isUsed: false,
        })),
        history: [],
        currentRound: null,
      })

    case 'clearAllData':
      return createInitialAppState()

    case 'addParticipant':
      return {
        ...state,
        participants: [...state.participants, action.participant],
      }

    case 'addParticipants':
      return {
        ...state,
        participants: [...state.participants, ...action.participants],
      }

    case 'updateParticipant':
      return withReconciledRound({
        ...state,
        participants: state.participants.map((participant) =>
          participant.id === action.participantId
            ? {
                ...participant,
                name: action.name,
              }
            : participant,
        ),
      })

    case 'deleteParticipant':
      return withReconciledRound({
        ...state,
        participants: state.participants.filter(
          (participant) => participant.id !== action.participantId,
        ),
      })

    case 'setParticipantActive':
      return withReconciledRound({
        ...state,
        participants: state.participants.map((participant) =>
          participant.id === action.participantId
            ? {
                ...participant,
                isActive: action.isActive,
              }
            : participant,
        ),
      })

    case 'restoreParticipant':
      return withReconciledRound({
        ...state,
        participants: state.participants.map((participant) =>
          participant.id === action.participantId
            ? {
                ...participant,
                isActive: true,
                isUsed: false,
              }
            : participant,
        ),
      })

    case 'addPresentation':
      return {
        ...state,
        presentations: [...state.presentations, action.presentation],
      }

    case 'addPresentations':
      return {
        ...state,
        presentations: [...state.presentations, ...action.presentations],
      }

    case 'updatePresentation':
      return withReconciledRound({
        ...state,
        presentations: state.presentations.map((presentation) =>
          presentation.id === action.presentationId
            ? {
                ...presentation,
                title: action.title,
                url: action.url,
              }
            : presentation,
        ),
      })

    case 'deletePresentation':
      return withReconciledRound({
        ...state,
        presentations: state.presentations.filter(
          (presentation) => presentation.id !== action.presentationId,
        ),
      })

    case 'setPresentationActive':
      return withReconciledRound({
        ...state,
        presentations: state.presentations.map((presentation) =>
          presentation.id === action.presentationId
            ? {
                ...presentation,
                isActive: action.isActive,
              }
            : presentation,
        ),
      })

    case 'restorePresentation':
      return withReconciledRound({
        ...state,
        presentations: state.presentations.map((presentation) =>
          presentation.id === action.presentationId
            ? {
                ...presentation,
                isActive: true,
                isUsed: false,
              }
            : presentation,
        ),
      })

    case 'addPenalty':
      return {
        ...state,
        penalties: [...state.penalties, action.penalty],
      }

    case 'addPenalties':
      return {
        ...state,
        penalties: [...state.penalties, ...action.penalties],
      }

    case 'updatePenalty':
      return withReconciledRound({
        ...state,
        penalties: state.penalties.map((penalty) =>
          penalty.id === action.penaltyId
            ? {
                ...penalty,
                title: action.title,
                description: action.description,
              }
            : penalty,
        ),
      })

    case 'deletePenalty':
      return withReconciledRound({
        ...state,
        penalties: state.penalties.filter((penalty) => penalty.id !== action.penaltyId),
      })

    case 'setPenaltyActive':
      return withReconciledRound({
        ...state,
        penalties: state.penalties.map((penalty) =>
          penalty.id === action.penaltyId
            ? {
                ...penalty,
                isActive: action.isActive,
              }
            : penalty,
        ),
      })

    case 'restorePenalty':
      return withReconciledRound({
        ...state,
        penalties: state.penalties.map((penalty) =>
          penalty.id === action.penaltyId
            ? {
                ...penalty,
                isActive: true,
                isUsed: false,
              }
            : penalty,
        ),
      })

    case 'replaceState':
      return action.nextState

    default:
      return assertNever(action)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
}

function withReconciledRound(nextState: AppState): AppState {
  return {
    ...nextState,
    currentRound: reconcileCurrentRound(
      nextState.currentRound,
      nextState.participants,
      nextState.presentations,
      nextState.penalties,
      nextState.history,
    ),
  }
}

function getUniqueParticipantIds(
  primaryParticipantId: string,
  teammateParticipantId: string | null,
): Set<string> {
  const ids = new Set<string>([primaryParticipantId])

  if (teammateParticipantId !== null) {
    ids.add(teammateParticipantId)
  }

  return ids
}
