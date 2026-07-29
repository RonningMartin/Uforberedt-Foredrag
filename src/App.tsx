import { useLocalStorageReducer } from './hooks/useLocalStorage'
import { appReducer } from './state/appReducer'
import {
  APP_STORAGE_KEY,
  APP_VIEW_LABELS,
  APP_VIEWS,
  createInitialAppState,
  getAppStats,
} from './state/appState'
import { validateAppState } from './utils/dataValidation'

function App() {
  const { state, dispatch } = useLocalStorageReducer({
    storageKey: APP_STORAGE_KEY,
    reducer: appReducer,
    createInitialState: createInitialAppState,
    validate: validateAppState,
  })

  const stats = getAppStats(state)

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <h1>Uforberedt foredrag</h1>
            <p className="lead">Et enkelt oppsett for deltakere, presentasjoner og runder.</p>
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
        {state.activeView === 'setup' ? <SetupPlaceholder stats={stats} /> : null}
        {state.activeView === 'event' ? <EventPlaceholder /> : null}
        {state.activeView === 'history' ? <HistoryPlaceholder stats={stats} /> : null}
      </main>
    </div>
  )
}

type AppStats = ReturnType<typeof getAppStats>

function SetupPlaceholder({ stats }: { stats: AppStats }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Oppsett</p>
          <h2>Gjør klart arrangementet</h2>
        </div>
        <p className="status-line">
          {formatCount(stats.participants.available, 'deltaker', 'deltakere')} tilgjengelige ·{' '}
          {formatCount(stats.presentations.available, 'presentasjon', 'presentasjoner')} tilgjengelige
        </p>
      </div>

      <div className="setup-grid">
        <section className="soft-panel">
          <div className="soft-panel__header">
            <h3>Deltakere</h3>
            <button type="button" className="ghost-button" disabled>
              Legg til deltaker
            </button>
          </div>
          <p className="placeholder-copy">Deltakerlisten vises her når oppsettet tas i bruk.</p>
          <ul className="placeholder-list" aria-label="Eksempel på deltakerliste">
            <li>Ingen deltakere ennå</li>
            <li>Tilgjengelig, brukt og deaktivert vises her</li>
            <li>Flere deltakere kan legges til samtidig senere</li>
          </ul>
        </section>

        <section className="soft-panel">
          <div className="soft-panel__header">
            <h3>Presentasjoner</h3>
            <button type="button" className="ghost-button" disabled>
              Legg til presentasjon
            </button>
          </div>
          <p className="placeholder-copy">
            Presentasjonstitler og lenker samles her før arrangementet starter.
          </p>
          <ul className="placeholder-list" aria-label="Eksempel på presentasjonsliste">
            <li>Ingen presentasjoner ennå</li>
            <li>Status og lenker vises samlet på ett sted</li>
            <li>HTTP- og HTTPS-lenker legges til senere</li>
          </ul>
        </section>
      </div>

      <div className="panel-footer">
        <button type="button" className="primary-button" disabled>
          Start arrangement
        </button>
      </div>
    </section>
  )
}

function EventPlaceholder() {
  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Event</p>
          <h2>Visning for storskjerm</h2>
        </div>
      </div>

      <div className="event-placeholder" aria-hidden="true">
        <div className="event-placeholder__wheel" />
      </div>

      <p className="placeholder-copy">
        Her kommer en enkel visning for trekning av deltaker og presentasjon, med fokus på store
        knapper og tydelige valg.
      </p>

      <div className="panel-footer panel-footer--compact">
        <button type="button" className="primary-button" disabled>
          Spinn hjulet
        </button>
      </div>
    </section>
  )
}

function HistoryPlaceholder({ stats }: { stats: AppStats }) {
  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Historikk</p>
          <h2>Gjennomførte runder</h2>
        </div>
        <p className="status-line">{formatCount(stats.historyCount, 'runde', 'runder')} lagret</p>
      </div>

      <div className="history-placeholder" role="presentation">
        <div className="history-placeholder__head">
          <span>Runde</span>
          <span>Deltaker</span>
          <span>Presentasjon</span>
        </div>
        <p className="placeholder-copy">Bekreftede runder vises her når arrangementet er i gang.</p>
      </div>
    </section>
  )
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default App
