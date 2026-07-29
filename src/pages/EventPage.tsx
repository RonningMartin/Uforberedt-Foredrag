import { useState } from 'react'
import type { Dispatch } from 'react'

import RoundResult from '../components/RoundResult'
import { getAppStats } from '../state/appState'
import type { AppAction, AppState } from '../types/app'
import { createEntityId } from '../utils/entityId'
import {
  createHistoryEntryFromRound,
  createParticipantRoundSelection,
  createPresentationRoundSelection,
  getAvailableParticipants,
  getAvailablePresentations,
  moveRoundBackToParticipant,
  moveRoundToPresentation,
  selectAvailableParticipant,
  selectAvailablePresentation,
} from '../utils/roundLogic'

interface EventPageProps {
  state: AppState
  dispatch: Dispatch<AppAction>
}

function EventPage({ state, dispatch }: EventPageProps) {
  const [errors, setErrors] = useState<string[]>([])
  const stats = getAppStats(state)
  const round = state.currentRound
  const availableParticipants = getAvailableParticipants(state.participants)
  const availablePresentations = getAvailablePresentations(state.presentations)

  function handleSpinParticipant() {
    const result = selectAvailableParticipant(state.participants)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    const now = new Date().toISOString()
    dispatch({
      type: 'setCurrentRound',
      currentRound: createParticipantRoundSelection(
        round,
        result.data,
        round?.step === 'complete' ? createEntityId() : round?.id ?? createEntityId(),
        now,
      ),
    })
    setErrors([])
  }

  function handleContinueToPresentation() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundToPresentation(round),
    })
    setErrors([])
  }

  function handleSpinPresentation() {
    const result = selectAvailablePresentation(state.presentations)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    dispatch({
      type: 'setCurrentRound',
      currentRound: createPresentationRoundSelection(round, result.data),
    })
    setErrors([])
  }

  function handleBackToParticipant() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundBackToParticipant(round),
    })
    setErrors([])
  }

  function handleCancelRound() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: null,
    })
    setErrors([])
  }

  function handleConfirmRound() {
    const historyEntry = createHistoryEntryFromRound(
      round,
      state.history.length,
      createEntityId(),
      new Date().toISOString(),
    )

    if (!historyEntry.success) {
      setErrors(historyEntry.errors)
      return
    }

    dispatch({
      type: 'confirmCurrentRound',
      historyEntry: historyEntry.data,
    })
    setErrors([])
  }

  function handleStartNextRound() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: null,
    })
    setErrors([])
  }

  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Event</p>
          <h2>{getHeading(round)}</h2>
        </div>
        <p className="status-line">
          {formatCount(stats.participants.available, 'deltaker', 'deltakere')} tilgjengelige ·{' '}
          {formatCount(stats.presentations.available, 'presentasjon', 'presentasjoner')} tilgjengelige
        </p>
      </div>

      <div className="event-stepper" aria-label="Rundesteg">
        <span className={getStepClass(round, 'participant')}>Deltaker</span>
        <span className={getStepClass(round, 'presentation')}>Presentasjon</span>
        <span className={getStepClass(round, 'confirm')}>Bekreft</span>
      </div>

      {errors.length > 0 ? (
        <div className="notice notice--error" role="alert">
          <strong>Noe stoppet runden</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {round === null ? (
        <div className="event-stage">
          <div className="event-placeholder" aria-hidden="true">
            <div className="event-placeholder__wheel" />
          </div>
          <p className="placeholder-copy">
            Start med å trekke en deltaker blant dem som fortsatt er aktive og tilgjengelige.
          </p>
          <div className="panel-footer panel-footer--compact">
            <button
              type="button"
              className="primary-button"
              onClick={handleSpinParticipant}
              disabled={availableParticipants.length === 0}
            >
              Spinn deltaker
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'participant' ? (
        <div className="event-stage">
          <RoundResult label="Valgt deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={handleSpinParticipant}>
              Spinn på nytt
            </button>
            <button type="button" className="primary-button" onClick={handleContinueToPresentation}>
              Fortsett
            </button>
            <button type="button" className="text-button" onClick={handleCancelRound}>
              Avbryt
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'presentation' ? (
        <div className="event-stage">
          <RoundResult label="Deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
          <div className="event-placeholder" aria-hidden="true">
            <div className="event-placeholder__wheel" />
          </div>
          <p className="placeholder-copy">
            Nå trekkes en presentasjon blant dem som fortsatt er aktive og tilgjengelige.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleSpinPresentation}
              disabled={availablePresentations.length === 0}
            >
              Spinn presentasjon
            </button>
            <button type="button" className="ghost-button" onClick={handleBackToParticipant}>
              Gå tilbake
            </button>
            <button type="button" className="text-button" onClick={handleCancelRound}>
              Avbryt
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'confirm' ? (
        <div className="event-stage">
          <div className="event-results-grid">
            <RoundResult label="Deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={round.presentationUrl}
            />
          </div>
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={handleSpinPresentation}>
              Spinn på nytt
            </button>
            <button type="button" className="ghost-button" onClick={handleBackToParticipant}>
              Gå tilbake
            </button>
            <button type="button" className="primary-button" onClick={handleConfirmRound}>
              Bekreft runde
            </button>
            <button type="button" className="text-button" onClick={handleCancelRound}>
              Avbryt
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'complete' ? (
        <div className="event-stage">
          <div className="event-results-grid">
            <RoundResult label="Deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={round.presentationUrl}
            />
          </div>
          <p className="placeholder-copy">
            Runden er bekreftet og lagret. Både deltaker og presentasjon er nå markert som brukt.
          </p>
          <div className="panel-footer panel-footer--compact">
            <button type="button" className="primary-button" onClick={handleStartNextRound}>
              Start neste runde
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function getHeading(round: AppState['currentRound']) {
  if (round?.step === 'presentation') {
    return 'Velg presentasjon'
  }

  if (round?.step === 'confirm') {
    return 'Bekreft runden'
  }

  if (round?.step === 'complete') {
    return 'Runden er klar'
  }

  return 'Velg deltaker'
}

function getStepClass(round: AppState['currentRound'], step: 'participant' | 'presentation' | 'confirm') {
  const currentStep = round?.step ?? 'participant'
  const progression: Record<typeof step, number> = {
    participant: 1,
    presentation: 2,
    confirm: 3,
  }

  const currentValue =
    currentStep === 'participant'
      ? 1
      : currentStep === 'presentation'
        ? 2
        : 3

  return progression[step] <= currentValue ? 'event-stepper__item is-active' : 'event-stepper__item'
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default EventPage
