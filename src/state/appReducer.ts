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

    case 'replaceState':
      return action.nextState

    default:
      return assertNever(action)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`)
}
