import { useState } from 'react'
import type { Dispatch } from 'react'

import ConfirmationDialog from '../components/ConfirmationDialog'
import HistoryList from '../components/HistoryList'
import { getAppStats } from '../state/appState'
import type { AppAction, AppState } from '../types/app'

interface HistoryPageProps {
  state: AppState
  dispatch: Dispatch<AppAction>
}

function HistoryPage({ state, dispatch }: HistoryPageProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const stats = getAppStats(state)
  const usedParticipants = state.participants.filter((participant) => participant.isUsed).length
  const usedPresentations = state.presentations.filter((presentation) => presentation.isUsed).length
  const hasProgress =
    state.history.length > 0 ||
    state.currentRound !== null ||
    usedParticipants > 0 ||
    usedPresentations > 0

  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Historikk</p>
          <h2>Gjennomførte runder</h2>
          <p className="soft-panel__subtle">
            Se hva som er brukt, angre siste runde eller gjør enkeltvalg tilgjengelige igjen.
          </p>
        </div>
        <p className="status-line">{formatCount(stats.historyCount, 'runde', 'runder')} lagret</p>
      </div>

      <div className="history-toolbar">
        <button
          type="button"
          className="ghost-button"
          onClick={() => dispatch({ type: 'undoLastRound' })}
          disabled={state.history.length === 0}
        >
          Angre siste runde
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => setIsResetDialogOpen(true)}
          disabled={!hasProgress}
        >
          Nullstill arrangement
        </button>
      </div>

      <p className="history-summary">
        {formatCount(usedParticipants, 'brukt deltaker', 'brukte deltakere')} ·{' '}
        {formatCount(usedPresentations, 'brukt presentasjon', 'brukte presentasjoner')}
      </p>

      <HistoryList
        history={state.history}
        participants={state.participants}
        presentations={state.presentations}
        onRestoreParticipant={(participantId) =>
          dispatch({
            type: 'restoreParticipant',
            participantId,
          })
        }
        onRestorePresentation={(presentationId) =>
          dispatch({
            type: 'restorePresentation',
            presentationId,
          })
        }
      />

      {isResetDialogOpen ? (
        <ConfirmationDialog
          title="Nullstill arrangement?"
          message="Velg om du bare vil nullstille fremdriften, eller om alle lagrede data skal slettes."
          cancelLabel="Avbryt"
          actions={[
            {
              label: 'Behold deltakere og presentasjoner',
              tone: 'primary',
              onAction: () => {
                dispatch({ type: 'resetEventProgress' })
                setIsResetDialogOpen(false)
              },
            },
            {
              label: 'Slett alle data',
              tone: 'danger',
              onAction: () => {
                dispatch({ type: 'clearAllData' })
                setIsResetDialogOpen(false)
              },
            },
          ]}
          onCancel={() => setIsResetDialogOpen(false)}
        />
      ) : null}
    </section>
  )
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default HistoryPage
