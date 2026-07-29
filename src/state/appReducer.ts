import type { AppAction, AppState } from '../types/app'

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
      return {
        ...state,
        participants: state.participants.map((participant) =>
          participant.id === action.participantId
            ? {
                ...participant,
                name: action.name,
              }
            : participant,
        ),
      }

    case 'deleteParticipant':
      return {
        ...state,
        participants: state.participants.filter(
          (participant) => participant.id !== action.participantId,
        ),
        currentRound:
          state.currentRound?.participantId === action.participantId ? null : state.currentRound,
      }

    case 'setParticipantActive':
      return {
        ...state,
        participants: state.participants.map((participant) =>
          participant.id === action.participantId
            ? {
                ...participant,
                isActive: action.isActive,
              }
            : participant,
        ),
      }

    case 'restoreParticipant':
      return {
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
      }

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
      return {
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
      }

    case 'deletePresentation':
      return {
        ...state,
        presentations: state.presentations.filter(
          (presentation) => presentation.id !== action.presentationId,
        ),
        currentRound:
          state.currentRound?.presentationId === action.presentationId ? null : state.currentRound,
      }

    case 'setPresentationActive':
      return {
        ...state,
        presentations: state.presentations.map((presentation) =>
          presentation.id === action.presentationId
            ? {
                ...presentation,
                isActive: action.isActive,
              }
            : presentation,
        ),
      }

    case 'restorePresentation':
      return {
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
      }

    case 'replaceState':
      return action.nextState

    default:
      return assertNever(action)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
}
