import type {
  EntityId,
  Participant,
  Penalty,
  Presentation,
  RoundHistoryEntry,
} from '../types/domain'
import { formatTeamName, getTeamLabel } from '../utils/teamDisplay'

interface HistoryListProps {
  history: readonly RoundHistoryEntry[]
  participants: readonly Participant[]
  presentations: readonly Presentation[]
  penalties: readonly Penalty[]
  onRestoreParticipant: (participantId: EntityId) => void
  onRestorePresentation: (presentationId: EntityId) => void
  onRestorePenalty: (penaltyId: EntityId) => void
}

function HistoryList({
  history,
  participants,
  presentations,
  penalties,
  onRestoreParticipant,
  onRestorePresentation,
  onRestorePenalty,
}: HistoryListProps) {
  if (history.length === 0) {
    return <p className="empty-state">Ingen bekreftede runder ennå.</p>
  }

  return (
    <ol className="history-list">
      {[...history].reverse().map((entry, index) => {
        const participantEntries = getParticipantEntries(entry)
        const presentation = presentations.find((candidate) => candidate.id === entry.presentationId)
        const presentationRestore = getPresentationRestoreState(presentation)
        const penalty = penalties.find((candidate) => candidate.id === entry.penaltyId)
        const penaltyRestore = getPenaltyRestoreState(entry, penalty)

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
                <p className="history-card__label">{getTeamLabel(entry.teammateParticipantName)}</p>
                <strong>{formatTeamName(entry.primaryParticipantName, entry.teammateParticipantName)}</strong>
                <div className="history-card__participant-list">
                  {participantEntries.map((participantEntry) => {
                    const participant = participants.find(
                      (candidate) => candidate.id === participantEntry.id,
                    )
                    const restoreState = getParticipantRestoreState(
                      participant,
                      participantEntry.role,
                    )

                    return (
                      <div key={`${participantEntry.role}-${participantEntry.id}`} className="history-card__participant-row">
                        <div className="history-card__participant-copy">
                          <p className="history-card__participant-name">{participantEntry.name}</p>
                          {restoreState.hint !== null ? (
                            <p className="history-card__hint">{restoreState.hint}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onRestoreParticipant(participantEntry.id)}
                          disabled={restoreState.disabled}
                        >
                          {restoreState.label}
                        </button>
                      </div>
                    )
                  })}
                </div>
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

              <section className="history-card__section">
                <p className="history-card__label">Straff</p>
                <strong>{entry.penaltyTitle ?? 'Ingen straff'}</strong>
                {entry.penaltyDescription !== null ? (
                  <p className="history-card__url">{entry.penaltyDescription}</p>
                ) : null}
                {penaltyRestore.hint !== null ? (
                  <p className="history-card__hint">{penaltyRestore.hint}</p>
                ) : null}
                {penaltyRestore.label !== null && entry.penaltyId !== null ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onRestorePenalty(entry.penaltyId!)}
                    disabled={penaltyRestore.disabled}
                  >
                    {penaltyRestore.label}
                  </button>
                ) : null}
              </section>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

type ParticipantRole = 'participant' | 'primary' | 'teammate'

interface ParticipantEntry {
  id: string
  name: string
  role: ParticipantRole
}

interface RestoreState {
  label: string | null
  disabled: boolean
  hint: string | null
}

function getParticipantEntries(entry: RoundHistoryEntry): ParticipantEntry[] {
  const entries: ParticipantEntry[] = [
    {
      id: entry.primaryParticipantId,
      name: entry.primaryParticipantName,
      role: entry.teammateParticipantId === null ? 'participant' : 'primary',
    },
  ]

  if (
    entry.teammateParticipantId !== null &&
    entry.teammateParticipantName !== null &&
    entry.teammateParticipantId !== entry.primaryParticipantId
  ) {
    entries.push({
      id: entry.teammateParticipantId,
      name: entry.teammateParticipantName,
      role: 'teammate',
    })
  }

  return entries
}

function getParticipantRestoreState(
  entity: Participant | undefined,
  role: ParticipantRole,
): RestoreState {
  const labels = getParticipantLabels(role)

  if (entity === undefined) {
    return {
      label: labels.deleted,
      disabled: true,
      hint: 'Elementet finnes ikke lenger i oppsettet.',
    }
  }

  if (entity.isActive && !entity.isUsed) {
    return {
      label: labels.available,
      disabled: true,
      hint: 'Kan allerede brukes i en ny runde.',
    }
  }

  return {
    label: labels.restore,
    disabled: false,
    hint: entity.isUsed ? 'Var markert som brukt.' : 'Var deaktivert og blir gjort tilgjengelig igjen.',
  }
}

function getPresentationRestoreState(
  entity: Presentation | undefined,
): RestoreState {
  if (entity === undefined) {
    return {
      label: 'Presentasjonen er slettet',
      disabled: true,
      hint: 'Elementet finnes ikke lenger i oppsettet.',
    }
  }

  if (entity.isActive && !entity.isUsed) {
    return {
      label: 'Presentasjonen er allerede tilgjengelig',
      disabled: true,
      hint: 'Kan allerede brukes i en ny runde.',
    }
  }

  return {
    label: 'Gjenopprett presentasjon',
    disabled: false,
    hint: entity.isUsed ? 'Var markert som brukt.' : 'Var deaktivert og blir gjort tilgjengelig igjen.',
  }
}

function getPenaltyRestoreState(
  entry: RoundHistoryEntry,
  entity: Penalty | undefined,
): RestoreState {
  if (entry.penaltyId === null) {
    return {
      label: null,
      disabled: true,
      hint: 'Denne runden fikk ingen straff.',
    }
  }

  if (entity === undefined) {
    return {
      label: 'Straffen er slettet',
      disabled: true,
      hint: 'Elementet finnes ikke lenger i oppsettet.',
    }
  }

  if (entity.isActive && !entity.isUsed) {
    return {
      label: 'Straffen er allerede tilgjengelig',
      disabled: true,
      hint: 'Kan allerede trekkes i en ny runde.',
    }
  }

  return {
    label: 'Gjenopprett straff',
    disabled: false,
    hint: entity.isUsed ? 'Var markert som brukt.' : 'Var deaktivert og blir gjort tilgjengelig igjen.',
  }
}

function getParticipantLabels(role: ParticipantRole) {
  if (role === 'primary') {
    return {
      restore: 'Gjenopprett hoveddeltaker',
      available: 'Hoveddeltakeren er allerede tilgjengelig',
      deleted: 'Hoveddeltakeren er slettet',
    }
  }

  if (role === 'teammate') {
    return {
      restore: 'Gjenopprett lagkamerat',
      available: 'Lagkameraten er allerede tilgjengelig',
      deleted: 'Lagkameraten er slettet',
    }
  }

  return {
    restore: 'Gjenopprett deltaker',
    available: 'Deltakeren er allerede tilgjengelig',
    deleted: 'Deltakeren er slettet',
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
