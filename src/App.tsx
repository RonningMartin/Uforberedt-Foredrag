import { useLocalStorageReducer } from './hooks/useLocalStorage'
import EventPage from './pages/EventPage'
import HistoryPage from './pages/HistoryPage'
import SetupPage from './pages/SetupPage'
import { appReducer } from './state/appReducer'
import {
  APP_STORAGE_KEY,
  APP_VIEW_LABELS,
  APP_VIEWS,
  createInitialAppState,
} from './state/appState'
import { validateAppState } from './utils/dataValidation'

function App() {
  const { state, dispatch } = useLocalStorageReducer({
    storageKey: APP_STORAGE_KEY,
    reducer: appReducer,
    createInitialState: createInitialAppState,
    validate: validateAppState,
  })

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <h1>Uforberedt foredrag</h1>
            <p className="lead">Legg til deltakere og presentasjoner før arrangementet starter.</p>
          </div>

          <nav className="top-nav" aria-label="Hovedvisninger">
            {APP_VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                className={view === state.activeView ? 'top-nav__button is-active' : 'top-nav__button'}
                onClick={() => dispatch({ type: 'navigate', view })}
                aria-current={view === state.activeView ? 'page' : undefined}
              >
                {APP_VIEW_LABELS[view]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        {state.activeView === 'setup' ? <SetupPage state={state} dispatch={dispatch} /> : null}
        {state.activeView === 'event' ? <EventPage state={state} dispatch={dispatch} /> : null}
        {state.activeView === 'history' ? <HistoryPage historyCount={state.history.length} /> : null}
      </main>
    </div>
  )
}

export default App
