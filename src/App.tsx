import { useLocalStorageReducer } from './hooks/useLocalStorage'
import { appReducer } from './state/appReducer'
import {
  APP_STORAGE_KEY,
  APP_VIEW_LABELS,
  APP_VIEWS,
  createInitialAppState,
  getAppStats,
} from './state/appState'
import type { AppView } from './types/app'
import { validateAppState } from './utils/dataValidation'

const viewCopy: Record<
  AppView,
  {
    title: string
    description: string
    nextSteps: string[]
  }
> = {
  setup: {
    title: 'Oppsett kommer i neste fase',
    description:
      'Denne visningen reserveres til administrasjon av deltakere og presentasjoner. I fase 1 er målet bare å få state, persistens og struktur på plass.',
    nextSteps: [
      'Koble deltaker- og presentasjonsdata til sentral app-state.',
      'Legge til validerte skjemaer og raske bulk-felt.',
      'Forberede demo-datasett og tomtilstander.',
    ],
  },
  event: {
    title: 'Event-modus er klargjort, men ikke implementert',
    description:
      'Runde-logikk, spinning wheel og storskjermmodus bygges i senere faser. Fase 1 etablerer bare data- og navigasjonsgrunnlaget de skal bruke.',
    nextSteps: [
      'Bygge runde-motor med sikker trekning.',
      'Lage hjulkomponent som lander på forhåndsvalgt vinner.',
      'Legge til tastaturkontroller og fullscreen senere.',
    ],
  },
  history: {
    title: 'Historikk er reservert for neste steg',
    description:
      'Historikk, undo og reset kommer senere. Fase 1 gjør det mulig å lagre og gjenopprette tom eller gyldig app-state uten backend.',
    nextSteps: [
      'Lagre runder i en testbar historikkmodell.',
      'Legge til undo, restore og reset med bekreftelse.',
      'Gjøre import og eksport mulig når grunnmuren er stabil.',
    ],
  },
}

const foundationChecklist = [
  'Versjonert app-state med sterke TypeScript-typer',
  'Sentral reducer for navigasjon og videre utvidelser',
  'Trygg lesing og skriving til localStorage',
  'Validering og fallback ved korrupt lagret data',
  'Vitest-oppsett for logikktester',
]

function App() {
  const { state, dispatch, hydration } = useLocalStorageReducer({
    storageKey: APP_STORAGE_KEY,
    reducer: appReducer,
    createInitialState: createInitialAppState,
    validate: validateAppState,
  })

  const activeView = viewCopy[state.activeView]
  const stats = getAppStats(state)

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">React + TypeScript + Vite</p>
          <h1>Uforberedt foredrag</h1>
          <p className="lead">
            Grunnmuren for appen er nå på plass: versjonert state, lokal lagring, validering og et
            enkelt app-shell som kan bygges videre på i små steg.
          </p>
        </div>

        <div className="hero-card" aria-label="Status for lagret tilstand">
          <p className="card-label">Lagringsstatus</p>
          <strong>{getHydrationLabel(hydration.status)}</strong>
          <p>{hydration.message ?? 'Ingen problemer oppdaget i lokal lagring.'}</p>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <section className="card">
            <p className="card-label">App-shell</p>
            <nav className="view-nav" aria-label="Hovedvisninger">
              {APP_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={view === state.activeView ? 'view-button is-active' : 'view-button'}
                  onClick={() => dispatch({ type: 'navigate', view })}
                  aria-current={view === state.activeView ? 'page' : undefined}
                >
                  {APP_VIEW_LABELS[view]}
                </button>
              ))}
            </nav>
          </section>

          <section className="card">
            <p className="card-label">Fase 1</p>
            <h2>Det som er klart nå</h2>
            <ul className="checklist">
              {foundationChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="content">
          <section className="stats-grid" aria-label="Oversikt over nåværende data">
            <article className="stat-card">
              <p className="card-label">Deltakere</p>
              <strong>{stats.participants.total}</strong>
              <span>{stats.participants.available} tilgjengelige akkurat nå</span>
            </article>

            <article className="stat-card">
              <p className="card-label">Presentasjoner</p>
              <strong>{stats.presentations.total}</strong>
              <span>{stats.presentations.available} tilgjengelige akkurat nå</span>
            </article>

            <article className="stat-card">
              <p className="card-label">Runder</p>
              <strong>{stats.historyCount}</strong>
              <span>{state.currentRound ? 'En runde er klargjort' : 'Ingen aktiv runde ennå'}</span>
            </article>
          </section>

          <section className="card view-panel">
            <p className="card-label">Aktiv visning</p>
            <h2>{activeView.title}</h2>
            <p className="panel-copy">{activeView.description}</p>
            <ul className="next-steps">
              {activeView.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  )
}

function getHydrationLabel(status: ReturnType<typeof useLocalStorageReducer>['hydration']['status']) {
  switch (status) {
    case 'empty':
      return 'Tom lokal lagring'
    case 'loaded':
      return 'Lagret state gjenopprettet'
    case 'recovered':
      return 'Korrupt state ble nullstilt'
    case 'unavailable':
      return 'Lokal lagring er utilgjengelig'
    default:
      return status
  }
}

export default App
