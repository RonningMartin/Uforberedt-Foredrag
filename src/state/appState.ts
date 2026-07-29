import type { AppState, AppView } from '../types/app'
import type { AppSettings } from '../types/domain'

export const APP_STATE_VERSION = 1
export const APP_STORAGE_KEY = 'uforberedt-foredrag/app-state'

export const APP_VIEWS: readonly AppView[] = ['setup', 'event', 'history']

export const APP_VIEW_LABELS: Record<AppView, string> = {
  setup: 'Oppsett',
  event: 'Event',
  history: 'Historikk',
}

export function createInitialSettings(): AppSettings {
  return {
    automaticPresentationOpen: true,
  }
}

export function createInitialAppState(): AppState {
  return {
    version: APP_STATE_VERSION,
    activeView: 'setup',
    participants: [],
    presentations: [],
    history: [],
    currentRound: null,
    settings: createInitialSettings(),
  }
}

export function getAppStats(state: AppState) {
  const availableParticipants = state.participants.filter(
    (participant) => participant.isActive && !participant.isUsed,
  ).length

  const availablePresentations = state.presentations.filter(
    (presentation) => presentation.isActive && !presentation.isUsed,
  ).length

  return {
    participants: {
      total: state.participants.length,
      available: availableParticipants,
    },
    presentations: {
      total: state.presentations.length,
      available: availablePresentations,
    },
    historyCount: state.history.length,
  }
}
