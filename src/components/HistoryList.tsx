import type {
  EntityId,
  Participant,
  Presentation,
  RoundHistoryEntry,
} from '../types/domain'

interface HistoryListProps {
  history: readonly RoundHistoryEntry[]
  participants: readonly Participant[]
  presentations: readonly Presentation[]
  onRestoreParticipant: (participantId: EntityId) => void
  onRestorePresentation: (presentationId: EntityId) => void
}

function HistoryList({
  history,
  participants,
  presentations,
  onRestoreParticipant,
  onRestorePresentation,
}: HistoryListProps) {
  if (history.length === 0) {
    return <p className="empty-state">Ingen bekreftede runder ennå.</p>
  }

  return (
    <ol className="history-list">
      {[...history].reverse().map((entry, index) => {
        const participant = participants.find((candidate) => candidate.id === entry.participantId)
        const presentation = presentations.find((candidate) => candidate.id === entry.presentationId)
        const participantRestore = getRestoreState(participant, 'participant')
        const presentationRestore = getRestoreState(presentation, 'presentation')

        return (
          <li key={entry.id} className="history-card">
            <div className="history-card__header">
              <div>
                <p className="history-card__round">Runde {entry.roundNumber}</p>
                <time className="history-card__time" dateTime={entry.completedAt}>
                  {formatCompletedAt(entry.completedAt)}
                </time>
              </div>
              {index === 0 ? <span className="status-badge status-badge--used">Siste runde</span> : null}
            </div>

            <div className="history-card__grid">
              <section className="history-card__section">
                <p className="history-card__label">Deltaker</p>
                <strong>{entry.participantName}</strong>
                {participantRestore.hint !== null ? (
                  <p className="history-card__hint">{participantRestore.hint}</p>
                ) : null}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onRestoreParticipant(entry.participantId)}
                  disabled={participantRestore.disabled}
                >
                  {participantRestore.label}
                </button>
              </section>

              <section className="history-card__section">
                <p className="history-card__label">Presentasjon</p>
                <strong>{entry.presentationTitle}</strong>
                <a
                  href={entry.presentationUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="history-card__link"
                >
                  Åpne presentasjon ↗
                </a>
                <p className="history-card__url">{entry.presentationUrl}</p>
                {presentationRestore.hint !== null ? (
                  <p className="history-card__hint">{presentationRestore.hint}</p>
                ) : null}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onRestorePresentation(entry.presentationId)}
                  disabled={presentationRestore.disabled}
                >
                  {presentationRestore.label}
                </button>
              </section>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

interface RestoreState {
  label: string
  disabled: boolean
  hint: string | null
}

function getRestoreState(
  entity: Participant | Presentation | undefined,
  entityType: 'participant' | 'presentation',
): RestoreState {
  if (entity === undefined) {
    return {
      label: entityType === 'participant' ? 'Deltakeren er slettet' : 'Presentasjonen er slettet',
      disabled: true,
      hint: 'Elementet finnes ikke lenger i oppsettet.',
    }
  }

  if (entity.isActive && !entity.isUsed) {
    return {
      label: entityType === 'participant' ? 'Deltakeren er allerede tilgjengelig' : 'Presentasjonen er allerede tilgjengelig',
      disabled: true,
      hint: 'Kan allerede brukes i en ny runde.',
    }
  }

  return {
    label: entityType === 'participant' ? 'Gjenopprett deltaker' : 'Gjenopprett presentasjon',
    disabled: false,
    hint: entity.isUsed ? 'Var markert som brukt.' : 'Var deaktivert og blir gjort tilgjengelig igjen.',
  }
}

function formatCompletedAt(completedAt: string) {
  const date = new Date(completedAt)

  if (Number.isNaN(date.getTime())) {
    return completedAt
  }

  return new Intl.DateTimeFormat('nb-NO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default HistoryList
