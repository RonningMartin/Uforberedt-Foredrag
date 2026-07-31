import type {
  AppSettings,
  DraftRound,
  EntityId,
  Penalty,
  Participant,
  Presentation,
  RoundHistoryEntry,
} from './domain'

export type AppView = 'setup' | 'event' | 'history'

export interface AppState {
  version: number
  activeView: AppView
  participants: Participant[]
  presentations: Presentation[]
  penalties: Penalty[]
  history: RoundHistoryEntry[]
  currentRound: DraftRound | null
  settings: AppSettings
}

export type AppAction =
  | {
      type: 'navigate'
      view: AppView
    }
  | {
      type: 'setCurrentRound'
      currentRound: DraftRound | null
    }
  | {
      type: 'confirmCurrentRound'
      historyEntry: RoundHistoryEntry
    }
  | {
      type: 'undoLastRound'
    }
  | {
      type: 'resetEventProgress'
    }
  | {
      type: 'clearAllData'
    }
  | {
      type: 'addParticipant'
      participant: Participant
    }
  | {
      type: 'addParticipants'
      participants: Participant[]
    }
  | {
      type: 'updateParticipant'
      participantId: EntityId
      name: string
    }
  | {
      type: 'deleteParticipant'
      participantId: EntityId
    }
  | {
      type: 'setParticipantActive'
      participantId: EntityId
      isActive: boolean
    }
  | {
      type: 'restoreParticipant'
      participantId: EntityId
    }
  | {
      type: 'addPresentation'
      presentation: Presentation
    }
  | {
      type: 'addPresentations'
      presentations: Presentation[]
    }
  | {
      type: 'updatePresentation'
      presentationId: EntityId
      title: string
      url: string
    }
  | {
      type: 'deletePresentation'
      presentationId: EntityId
    }
  | {
      type: 'setPresentationActive'
      presentationId: EntityId
      isActive: boolean
    }
  | {
      type: 'restorePresentation'
      presentationId: EntityId
    }
  | {
      type: 'addPenalty'
      penalty: Penalty
    }
  | {
      type: 'addPenalties'
      penalties: Penalty[]
    }
  | {
      type: 'updatePenalty'
      penaltyId: EntityId
      title: string
      description: string | null
    }
  | {
      type: 'deletePenalty'
      penaltyId: EntityId
    }
  | {
      type: 'setPenaltyActive'
      penaltyId: EntityId
      isActive: boolean
    }
  | {
      type: 'restorePenalty'
      penaltyId: EntityId
    }
  | {
      type: 'confirmRoundPenalty'
      historyEntry: RoundHistoryEntry
    }
  | {
      type: 'replaceState'
      nextState: AppState
    }

export type StorageHydrationStatus = 'empty' | 'loaded' | 'recovered' | 'unavailable'

export interface StorageHydration<T> {
  state: T
  status: StorageHydrationStatus
  message: string | null
}

export interface ValidationSuccess<T> {
  success: true
  data: T
}

export interface ValidationFailure {
  success: false
  errors: string[]
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure
