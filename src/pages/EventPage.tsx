import { useState } from 'react'
import type { Dispatch, MouseEvent } from 'react'

import Wheel from '../components/Wheel'
import RoundResult from '../components/RoundResult'
import { useEventKeyboardShortcuts } from '../hooks/useEventKeyboardShortcuts'
import { useFullscreen } from '../hooks/useFullscreen'
import { getAppStats } from '../state/appState'
import type { AppAction, AppState } from '../types/app'
import { createEntityId } from '../utils/entityId'
import {
  getPresentationHost,
  openPresentationUrl,
  type OpenWindowFn,
} from '../utils/presentationLink'
import {
  createHistoryEntryFromRound,
  createParticipantRoundSelection,
  createPresentationRoundSelection,
  getAvailableParticipants,
  getAvailablePresentations,
  moveRoundBackToPresentation,
  moveRoundBackToParticipant,
  moveRoundToConfirm,
  moveRoundToPresentation,
  selectAvailableParticipant,
  selectAvailablePresentation,
} from '../utils/roundLogic'
import type { RandomSource } from '../utils/secureRandom'
import { isValidPresentationUrl } from '../utils/setupValidation'
import { calculateWheelRotation } from '../utils/wheelMath'

interface EventPageProps {
  state: AppState
  dispatch: Dispatch<AppAction>
  participantRandomSource?: RandomSource
  presentationRandomSource?: RandomSource
  openWindow?: OpenWindowFn
}

type SpinPhase = 'participant' | 'presentation'

interface PendingSpinState {
  phase: SpinPhase
  winnerId: string
  roundId?: string
  startedAt?: string
}

function EventPage({
  state,
  dispatch,
  participantRandomSource,
  presentationRandomSource,
  openWindow,
}: EventPageProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [participantRotation, setParticipantRotation] = useState(0)
  const [presentationRotation, setPresentationRotation] = useState(0)
  const [pendingSpin, setPendingSpin] = useState<PendingSpinState | null>(null)
  const fullscreen = useFullscreen<HTMLElement>()
  const stats = getAppStats(state)
  const round = state.currentRound
  const availableParticipants = getAvailableParticipants(state.participants)
  const availablePresentations = getAvailablePresentations(state.presentations)
  const isSpinning = pendingSpin !== null
  const isPresentationSelected =
    round?.step === 'presentation' &&
    round.presentationId !== null &&
    round.presentationTitle !== null &&
    round.presentationUrl !== null
  const presentationHost =
    round?.presentationUrl === null || round?.presentationUrl === undefined
      ? null
      : getPresentationHost(round.presentationUrl)
  const visibleErrors = fullscreen.error === null ? errors : [fullscreen.error, ...errors]
  const currentParticipantWinnerIndex = findWinnerIndex(
    availableParticipants,
    pendingSpin?.phase === 'participant' ? pendingSpin.winnerId : round?.participantId ?? null,
  )
  const currentPresentationWinnerIndex = findWinnerIndex(
    availablePresentations,
    pendingSpin?.phase === 'presentation' ? pendingSpin.winnerId : round?.presentationId ?? null,
  )
  const canSpinParticipant =
    !isSpinning &&
    availableParticipants.length > 0 &&
    (round === null || round.step === 'participant')
  const canSpinPresentation =
    !isSpinning && availablePresentations.length > 0 && round?.step === 'presentation'
  const canAdvance =
    !isSpinning &&
    ((round?.step === 'participant' && round.participantId !== null) || isPresentationSelected)
  const canConfirm = !isSpinning && round?.step === 'confirm'
  const canCancel = !isSpinning && round !== null && round.step !== 'complete'
  const canSpinCurrentWheel = canSpinParticipant || canSpinPresentation

  useEventKeyboardShortcuts({
    enabled: true,
    isFullscreen: fullscreen.isFullscreen,
    canSpin: canSpinCurrentWheel,
    canAdvance,
    canConfirm,
    canCancel,
    onSpin: handleSpinCurrentWheel,
    onAdvance: handleAdvance,
    onConfirm: handleConfirmRound,
    onCancel: handleCancelRound,
    onExitFullscreen: () => {
      void fullscreen.exitFullscreen()
    },
  })

  function handleSpinParticipant() {
    if (isSpinning) {
      return
    }

    const result = selectAvailableParticipant(state.participants, participantRandomSource)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    const winnerIndex = availableParticipants.findIndex((participant) => participant.id === result.data.id)
    const now = new Date().toISOString()
    setPendingSpin({
      phase: 'participant',
      winnerId: result.data.id,
      roundId: round?.step === 'complete' ? createEntityId() : round?.id ?? createEntityId(),
      startedAt: round?.step === 'complete' ? now : round?.startedAt ?? now,
    })
    setParticipantRotation((currentRotation) =>
      calculateWheelRotation({
        itemCount: availableParticipants.length,
        winnerIndex,
        currentRotation,
      }),
    )
    setErrors([])
    fullscreen.clearError()
  }

  function handleContinueToPresentation() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundToPresentation(round),
    })
    setErrors([])
  }

  function handleSpinPresentation() {
    if (isSpinning) {
      return
    }

    const result = selectAvailablePresentation(state.presentations, presentationRandomSource)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    const winnerIndex = availablePresentations.findIndex(
      (presentation) => presentation.id === result.data.id,
    )
    setPendingSpin({
      phase: 'presentation',
      winnerId: result.data.id,
    })
    setPresentationRotation((currentRotation) =>
      calculateWheelRotation({
        itemCount: availablePresentations.length,
        winnerIndex,
        currentRotation,
      }),
    )
    setErrors([])
    fullscreen.clearError()
  }

  function handleParticipantSpinEnd() {
    if (
      pendingSpin === null ||
      pendingSpin.phase !== 'participant' ||
      pendingSpin.roundId === undefined ||
      pendingSpin.startedAt === undefined
    ) {
      return
    }

    const selectedParticipant = getAvailableParticipants(state.participants).find(
      (participant) => participant.id === pendingSpin.winnerId,
    )

    setPendingSpin(null)

    if (selectedParticipant === undefined) {
      setErrors(['Den valgte deltakeren er ikke lenger tilgjengelig. Spinn på nytt.'])
      return
    }

    dispatch({
      type: 'setCurrentRound',
      currentRound: createParticipantRoundSelection(
        round,
        selectedParticipant,
        pendingSpin.roundId,
        pendingSpin.startedAt,
      ),
    })
  }

  function handlePresentationSpinEnd() {
    if (pendingSpin === null || pendingSpin.phase !== 'presentation') {
      return
    }

    const selectedPresentation = getAvailablePresentations(state.presentations).find(
      (presentation) => presentation.id === pendingSpin.winnerId,
    )

    setPendingSpin(null)

    if (selectedPresentation === undefined) {
      setErrors(['Den valgte presentasjonen er ikke lenger tilgjengelig. Spinn på nytt.'])
      dispatch({
        type: 'setCurrentRound',
        currentRound: moveRoundToPresentation(round),
      })
      return
    }

    dispatch({
      type: 'setCurrentRound',
      currentRound: createPresentationRoundSelection(round, selectedPresentation),
    })
  }

  function handleBackToParticipant() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundBackToParticipant(round),
    })
    setErrors([])
  }

  function handleBackToPresentation() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundBackToPresentation(round),
    })
    setErrors([])
  }

  function handleContinueToConfirm() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundToConfirm(round),
    })
    setErrors([])
  }

  function handleCancelRound() {
    if (isSpinning) {
      return
    }

    setPendingSpin(null)
    dispatch({
      type: 'setCurrentRound',
      currentRound: null,
    })
    setErrors([])
  }

  function handleConfirmRound() {
    if (isSpinning) {
      return
    }

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
    setPendingSpin(null)
    dispatch({
      type: 'setCurrentRound',
      currentRound: null,
    })
    setErrors([])
  }

  function handleSpinCurrentWheel() {
    if (round === null || round.step === 'participant') {
      handleSpinParticipant()
      return
    }

    if (round.step === 'presentation') {
      handleSpinPresentation()
    }
  }

  function handleAdvance() {
    if (round?.step === 'participant') {
      handleContinueToPresentation()
      return
    }

    if (isPresentationSelected) {
      handleContinueToConfirm()
    }
  }

  function handleOpenPresentation(event: MouseEvent<HTMLAnchorElement>, presentationUrl: string | null) {
    event.preventDefault()

    const result = openPresentationUrl(presentationUrl, openWindow)

    if (!result.success) {
      setErrors(result.error === undefined ? ['Kunne ikke åpne presentasjonen.'] : [result.error])
      return
    }

    setErrors([])
  }

  return (
    <section
      ref={fullscreen.containerRef}
      className={fullscreen.isFullscreen ? 'event-page event-page--fullscreen' : 'event-page'}
    >
      <div className="event-page__toolbar">
        <button
          type="button"
          className="text-button event-page__toolbar-link"
          onClick={() => dispatch({ type: 'navigate', view: 'setup' })}
        >
          Til oppsett
        </button>
        <button type="button" className="ghost-button event-page__fullscreen-button" onClick={() => void fullscreen.toggleFullscreen()}>
          {fullscreen.isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
        </button>
      </div>

      <div className="event-page__hero">
        <div>
          <p className="section-label">Eventmodus</p>
          <h2 className="event-page__heading">{getHeading(round)}</h2>
          <p className="event-page__subtle">
            {formatCount(stats.participants.available, 'deltaker', 'deltakere')} tilgjengelige ·{' '}
            {formatCount(stats.presentations.available, 'presentasjon', 'presentasjoner')} tilgjengelige
          </p>
        </div>
      </div>

      <div className="event-stepper" aria-label="Rundesteg">
        <span className={getStepClass(round, 'participant')}>Deltaker</span>
        <span className={getStepClass(round, 'presentation')}>Presentasjon</span>
        <span className={getStepClass(round, 'confirm')}>Bekreft</span>
      </div>

      {visibleErrors.length > 0 ? (
        <div className="notice notice--error" role="alert">
          <strong>Noe stoppet runden</strong>
          <ul className="event-page__notice-list">
            {visibleErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {round === null ? (
        <div className="event-stage event-stage--wheel">
          <Wheel
            ariaLabel="Hjul med tilgjengelige deltakere"
            items={availableParticipants.map((participant) => ({
              id: participant.id,
              label: participant.name,
            }))}
            rotation={participantRotation}
            spinning={pendingSpin?.phase === 'participant'}
            winnerIndex={currentParticipantWinnerIndex}
            emptyLabel="Ingen deltakere igjen"
            onSpinEnd={handleParticipantSpinEnd}
          />
          <p className="placeholder-copy event-stage__copy">
            Start med å trekke en deltaker blant dem som fortsatt er aktive og tilgjengelige.
          </p>
          <div className="panel-footer panel-footer--compact">
            <button
              type="button"
              className="primary-button"
              onClick={handleSpinParticipant}
              disabled={!canSpinParticipant}
            >
              Spinn hjulet
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'participant' ? (
        <div className="event-stage event-stage--wheel">
          <Wheel
            ariaLabel="Hjul med tilgjengelige deltakere"
            items={availableParticipants.map((participant) => ({
              id: participant.id,
              label: participant.name,
            }))}
            rotation={participantRotation}
            spinning={pendingSpin?.phase === 'participant'}
            winnerIndex={currentParticipantWinnerIndex}
            emptyLabel="Ingen deltakere igjen"
            onSpinEnd={handleParticipantSpinEnd}
          />
          <RoundResult label="Valgt deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
          <div className="button-row">
            <button
              type="button"
              className="ghost-button"
              onClick={handleSpinParticipant}
              disabled={!canSpinParticipant}
            >
              Spinn på nytt
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleContinueToPresentation}
              disabled={!canAdvance}
            >
              Fortsett
            </button>
            <button type="button" className="text-button" onClick={handleCancelRound} disabled={!canCancel}>
              Avbryt
            </button>
          </div>
        </div>
      ) : null}

      {round?.step === 'presentation' ? (
        <div className="event-stage event-stage--wheel">
          <RoundResult label="Deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
          <Wheel
            ariaLabel="Hjul med tilgjengelige presentasjoner"
            items={availablePresentations.map((presentation) => ({
              id: presentation.id,
              label: presentation.title,
            }))}
            rotation={presentationRotation}
            spinning={pendingSpin?.phase === 'presentation'}
            winnerIndex={currentPresentationWinnerIndex}
            emptyLabel="Ingen presentasjoner igjen"
            onSpinEnd={handlePresentationSpinEnd}
          />

          {!isPresentationSelected ? (
            <>
              <p className="placeholder-copy event-stage__copy">
                Nå trekkes en presentasjon blant dem som fortsatt er aktive og tilgjengelige.
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSpinPresentation}
                  disabled={!canSpinPresentation}
                >
                  Spinn hjulet
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleBackToParticipant}
                  disabled={isSpinning}
                >
                  Tilbake
                </button>
                <button type="button" className="text-button" onClick={handleCancelRound} disabled={!canCancel}>
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <>
              <RoundResult
                label="Valgt presentasjon"
                value={round.presentationTitle ?? 'Ukjent presentasjon'}
                secondary={presentationHost}
              />
              <div className="button-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleSpinPresentation}
                  disabled={!canSpinPresentation}
                >
                  Spinn på nytt
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleBackToParticipant}
                  disabled={isSpinning}
                >
                  Tilbake
                </button>
                {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleContinueToConfirm}
                  disabled={!canAdvance}
                >
                  Fortsett
                </button>
                <button type="button" className="text-button" onClick={handleCancelRound} disabled={!canCancel}>
                  Avbryt
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {round?.step === 'confirm' ? (
        <div className="event-stage">
          <div className="event-results-grid">
            <RoundResult label="Deltaker" value={round.participantName ?? 'Ukjent deltaker'} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={presentationHost}
            />
          </div>
          <div className="button-row event-stage__actions">
            <button type="button" className="ghost-button" onClick={handleBackToPresentation} disabled={isSpinning}>
              Tilbake
            </button>
            {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
            <button type="button" className="primary-button" onClick={handleConfirmRound} disabled={!canConfirm}>
              Bekreft runde
            </button>
            <button type="button" className="text-button" onClick={handleCancelRound} disabled={!canCancel}>
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
              secondary={presentationHost}
            />
          </div>
          <p className="placeholder-copy event-stage__copy">
            Runden er bekreftet og lagret. Både deltaker og presentasjon er nå markert som brukt.
          </p>
          <div className="button-row">
            {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
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
    return 'Runden er fullført'
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

function findWinnerIndex(items: { id: string }[], winnerId: string | null): number | null {
  if (winnerId === null) {
    return null
  }

  const index = items.findIndex((item) => item.id === winnerId)

  return index === -1 ? null : index
}

function renderPresentationOpenAction(
  presentationUrl: string | null,
  onOpen: (event: MouseEvent<HTMLAnchorElement>, presentationUrl: string | null) => void,
) {
  const isValidUrl = presentationUrl !== null && isValidPresentationUrl(presentationUrl)
  const href = isValidUrl ? presentationUrl : '#'

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="primary-button primary-button--link"
      onClick={(event) => onOpen(event, presentationUrl)}
      aria-disabled={!isValidUrl}
    >
      Åpne presentasjon ↗
    </a>
  )
}

export default EventPage
