import type { AppSettings, DraftRound, Participant, Presentation, RoundHistoryEntry } from './domain'

export type AppView = 'setup' | 'event' | 'history'

export interface AppState {
  version: number
  activeView: AppView
  participants: Participant[]
  presentations: Presentation[]
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
