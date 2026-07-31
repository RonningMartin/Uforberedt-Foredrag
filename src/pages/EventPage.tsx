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
  cancelPenaltySelection,
  createHistoryEntryFromRound,
  createHistoryEntryWithPenalty,
  createParticipantRoundSelection,
  createPenaltyRoundSelection,
  createPresentationRoundSelection,
  createTeammateRoundSelection,
  getAvailableParticipants,
  getAvailablePenalties,
  getAvailablePresentations,
  getAvailableTeammates,
  moveRoundBackToParticipant,
  moveRoundBackToPresentation,
  moveRoundToConfirm,
  moveRoundToPenaltySelection,
  moveRoundToPresentation,
  moveRoundToTeammateSelection,
  removeTeammateFromRound,
  selectAvailableParticipant,
  selectAvailablePenalty,
  selectAvailablePresentation,
  selectAvailableTeammate,
} from '../utils/roundLogic'
import type { RandomSource } from '../utils/secureRandom'
import { isValidPresentationUrl } from '../utils/setupValidation'
import { formatTeamName, getTeamLabel } from '../utils/teamDisplay'
import { calculateWheelRotation } from '../utils/wheelMath'

interface EventPageProps {
  state: AppState
  dispatch: Dispatch<AppAction>
  participantRandomSource?: RandomSource
  presentationRandomSource?: RandomSource
  penaltyRandomSource?: RandomSource
  openWindow?: OpenWindowFn
}

type SpinPhase = 'primary' | 'teammate' | 'presentation' | 'penalty'

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
  penaltyRandomSource,
  openWindow,
}: EventPageProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [participantRotation, setParticipantRotation] = useState(0)
  const [presentationRotation, setPresentationRotation] = useState(0)
  const [penaltyRotation, setPenaltyRotation] = useState(0)
  const [pendingSpin, setPendingSpin] = useState<PendingSpinState | null>(null)
  const fullscreen = useFullscreen<HTMLElement>()
  const stats = getAppStats(state)
  const round = state.currentRound
  const availableParticipants = getAvailableParticipants(state.participants)
  const availablePresentations = getAvailablePresentations(state.presentations)
  const availablePenalties = getAvailablePenalties(state.penalties)
  const hasPrimaryParticipant = hasPrimarySelection(round)
  const hasTeammateParticipant = hasTeammateSelection(round)
  const hasPenalty = hasPenaltySelection(round)
  const availableTeammates = hasPrimaryParticipant
    ? getAvailableTeammates(state.participants, round?.primaryParticipantId ?? null)
    : []
  const participantWheelItems =
    round?.step === 'teammate' ? availableTeammates : availableParticipants
  const currentParticipantWinnerIndex = findWinnerIndex(
    participantWheelItems,
    getCurrentParticipantWinnerId(round, pendingSpin),
  )
  const currentPresentationWinnerIndex = findWinnerIndex(
    availablePresentations,
    pendingSpin?.phase === 'presentation' ? pendingSpin.winnerId : round?.presentationId ?? null,
  )
  const currentPenaltyWinnerIndex = findWinnerIndex(
    availablePenalties,
    pendingSpin?.phase === 'penalty' ? pendingSpin.winnerId : round?.penaltyId ?? null,
  )
  const isSpinning = pendingSpin !== null
  const isPresentationSelected = hasPresentationSelection(round)
  const teamName = formatTeamName(
    round?.primaryParticipantName ?? null,
    round?.teammateParticipantName ?? null,
  )
  const participantLabel = getTeamLabel(round?.teammateParticipantName ?? null)
  const presentationHost =
    round?.presentationUrl === null || round?.presentationUrl === undefined
      ? null
      : getPresentationHost(round.presentationUrl)
  const visibleErrors = fullscreen.error === null ? errors : [fullscreen.error, ...errors]
  const canSpinPrimary =
    !isSpinning &&
    availableParticipants.length > 0 &&
    (round === null || round.step === 'participant')
  const canSpinTeammate =
    !isSpinning && round?.step === 'teammate' && availableTeammates.length > 0
  const canSpinPresentation =
    !isSpinning && availablePresentations.length > 0 && round?.step === 'presentation'
  const canSpinPenalty =
    !isSpinning &&
    round?.step === 'penalty' &&
    availablePenalties.length > 0
  const canAddTeammate =
    !isSpinning &&
    round?.step === 'participant' &&
    hasPrimaryParticipant &&
    availableTeammates.length > 0
  const canContinueSolo = !isSpinning && round?.step === 'participant' && hasPrimaryParticipant
  const canContinueWithTeammate =
    !isSpinning && round?.step === 'teammate' && hasTeammateParticipant
  const canConfirmRound = !isSpinning && round?.step === 'confirm'
  const canConfirmPenalty = !isSpinning && round?.step === 'penalty' && hasPenalty
  const canMoveToPenalty =
    !isSpinning &&
    round?.step === 'complete' &&
    !hasPenalty &&
    availablePenalties.length > 0
  const canCancel = !isSpinning && round !== null && round.step !== 'complete'
  const canSpinCurrentWheel =
    canSpinPrimary || canSpinTeammate || canSpinPresentation || canSpinPenalty
  const canAdvance =
    !isSpinning &&
    ((round?.step === 'participant' && hasPrimaryParticipant) ||
      (round?.step === 'teammate' && hasTeammateParticipant) ||
      (round?.step === 'presentation' && isPresentationSelected))
  const canConfirm = canConfirmRound || canConfirmPenalty

  useEventKeyboardShortcuts({
    enabled: true,
    isFullscreen: fullscreen.isFullscreen,
    canSpin: canSpinCurrentWheel,
    canAdvance,
    canConfirm,
    canCancel,
    onSpin: handleSpinCurrentWheel,
    onAdvance: handleAdvance,
    onConfirm: handleConfirmAction,
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
      phase: 'primary',
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

  function handleSpinTeammate() {
    if (isSpinning || round?.step !== 'teammate') {
      return
    }

    const result = selectAvailableTeammate(
      state.participants,
      round.primaryParticipantId,
      participantRandomSource,
    )

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    const winnerIndex = availableTeammates.findIndex((participant) => participant.id === result.data.id)
    setPendingSpin({
      phase: 'teammate',
      winnerId: result.data.id,
    })
    setParticipantRotation((currentRotation) =>
      calculateWheelRotation({
        itemCount: availableTeammates.length,
        winnerIndex,
        currentRotation,
      }),
    )
    setErrors([])
    fullscreen.clearError()
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

  function handleSpinPenalty() {
    if (isSpinning || round?.step !== 'penalty') {
      return
    }

    const result = selectAvailablePenalty(state.penalties, penaltyRandomSource)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    const winnerIndex = availablePenalties.findIndex((penalty) => penalty.id === result.data.id)
    setPendingSpin({
      phase: 'penalty',
      winnerId: result.data.id,
    })
    setPenaltyRotation((currentRotation) =>
      calculateWheelRotation({
        itemCount: availablePenalties.length,
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

  function handleMoveToTeammateSelection() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundToTeammateSelection(round),
    })
    setErrors([])
  }

  function handleMoveToPenaltySelection() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: moveRoundToPenaltySelection(round),
    })
    setErrors([])
  }

  function handlePrimarySpinEnd() {
    if (
      pendingSpin === null ||
      pendingSpin.phase !== 'primary' ||
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

  function handleTeammateSpinEnd() {
    if (pendingSpin === null || pendingSpin.phase !== 'teammate') {
      return
    }

    const selectedTeammate = getAvailableTeammates(
      state.participants,
      round?.primaryParticipantId ?? null,
    ).find((participant) => participant.id === pendingSpin.winnerId)

    setPendingSpin(null)

    if (selectedTeammate === undefined) {
      setErrors(['Den valgte lagkameraten er ikke lenger tilgjengelig. Spinn på nytt.'])
      dispatch({
        type: 'setCurrentRound',
        currentRound: moveRoundToTeammateSelection(round),
      })
      return
    }

    dispatch({
      type: 'setCurrentRound',
      currentRound: createTeammateRoundSelection(round, selectedTeammate),
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

  function handlePenaltySpinEnd() {
    if (pendingSpin === null || pendingSpin.phase !== 'penalty') {
      return
    }

    const selectedPenalty = getAvailablePenalties(state.penalties).find(
      (penalty) => penalty.id === pendingSpin.winnerId,
    )

    setPendingSpin(null)

    if (selectedPenalty === undefined) {
      setErrors(['Den valgte straffen er ikke lenger tilgjengelig. Spinn på nytt.'])
      dispatch({
        type: 'setCurrentRound',
        currentRound: moveRoundToPenaltySelection(round),
      })
      return
    }

    dispatch({
      type: 'setCurrentRound',
      currentRound: createPenaltyRoundSelection(round, selectedPenalty),
    })
  }

  function handleBackToParticipantPhase() {
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

  function handleRemoveTeammate() {
    dispatch({
      type: 'setCurrentRound',
      currentRound: removeTeammateFromRound(round),
    })
    setErrors([])
  }

  function handleCancelRound() {
    if (isSpinning) {
      return
    }

    setPendingSpin(null)

    if (round?.step === 'penalty') {
      dispatch({
        type: 'setCurrentRound',
        currentRound: cancelPenaltySelection(round),
      })
      setErrors([])
      return
    }

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

  function handleConfirmPenalty() {
    if (isSpinning || round?.step !== 'penalty' || round.historyEntryId === null || !hasPenalty) {
      return
    }

    const selectedPenalty = getAvailablePenalties(state.penalties).find(
      (penalty) => penalty.id === round.penaltyId,
    )

    if (selectedPenalty === undefined) {
      setErrors(['Den valgte straffen er ikke lenger tilgjengelig. Spinn på nytt.'])
      dispatch({
        type: 'setCurrentRound',
        currentRound: moveRoundToPenaltySelection(round),
      })
      return
    }

    const historyEntry = state.history.find((entry) => entry.id === round.historyEntryId)

    if (historyEntry === undefined) {
      setErrors(['Den bekreftede runden ble ikke funnet i historikken.'])
      return
    }

    const updatedHistoryEntry = createHistoryEntryWithPenalty(historyEntry, selectedPenalty)

    if (!updatedHistoryEntry.success) {
      setErrors(updatedHistoryEntry.errors)
      return
    }

    dispatch({
      type: 'confirmRoundPenalty',
      historyEntry: updatedHistoryEntry.data,
    })
    setErrors([])
  }

  function handleConfirmAction() {
    if (round?.step === 'penalty') {
      handleConfirmPenalty()
      return
    }

    handleConfirmRound()
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

    if (round.step === 'teammate') {
      handleSpinTeammate()
      return
    }

    if (round.step === 'presentation') {
      handleSpinPresentation()
      return
    }

    if (round.step === 'penalty') {
      handleSpinPenalty()
    }
  }

  function handleAdvance() {
    if (round?.step === 'participant') {
      handleContinueToPresentation()
      return
    }

    if (round?.step === 'teammate' && hasTeammateParticipant) {
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
          className="event-page__icon-button"
          onClick={() => dispatch({ type: 'navigate', view: 'setup' })}
          aria-label="Til oppsett"
        >
          <HomeIcon />
        </button>
        <button
          type="button"
          className="ghost-button event-page__fullscreen-button"
          onClick={() => void fullscreen.toggleFullscreen()}
        >
          {fullscreen.isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
        </button>
      </div>

      <div className="event-page__hero">
        <h2 className="event-page__heading">{getHeading(round)}</h2>
        <p className="event-page__subtle">
          {formatCount(stats.participants.available, 'deltaker', 'deltakere')} tilgjengelige ·{' '}
          {formatCount(stats.presentations.available, 'presentasjon', 'presentasjoner')} tilgjengelige ·{' '}
          {formatCount(stats.penalties.available, 'straff', 'straffer')} tilgjengelige
        </p>
        <div className="event-stepper" aria-label="Rundesteg">
          <span className={getStepClass(round, 'participant')}>Deltaker</span>
          <span className={getStepClass(round, 'presentation')}>Presentasjon</span>
          <span className={getStepClass(round, 'confirm')}>Bekreft</span>
        </div>
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
            spinning={pendingSpin?.phase === 'primary'}
            winnerIndex={currentParticipantWinnerIndex}
            emptyLabel="Ingen deltakere igjen"
            onSpinEnd={handlePrimarySpinEnd}
          />
          <p className="placeholder-copy event-stage__copy">
            Start med å trekke en deltaker blant dem som fortsatt er aktive og tilgjengelige.
          </p>
          <div className="event-actions event-actions--solo">
            <button
              type="button"
              className="primary-button"
              onClick={handleSpinParticipant}
              disabled={!canSpinPrimary}
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
            spinning={pendingSpin?.phase === 'primary'}
            winnerIndex={currentParticipantWinnerIndex}
            emptyLabel="Ingen deltakere igjen"
            onSpinEnd={handlePrimarySpinEnd}
          />
          <RoundResult label="Valgt deltaker" value={round.primaryParticipantName ?? 'Ukjent deltaker'} />
          <div className="event-actions event-actions--participant">
            {!canAddTeammate ? (
              <p className="event-actions__hint">
                Ingen tilgjengelig lagkamerat akkurat nå.
              </p>
            ) : null}
            <div className="event-actions__utility">
              <button
                type="button"
                className="ghost-button event-actions__utility-button"
                onClick={handleSpinParticipant}
                disabled={!canSpinPrimary}
              >
                Spinn på nytt
              </button>
            </div>
            <div className="event-actions__grid">
              <div className="event-actions__slot event-actions__slot--start">
                <button
                  type="button"
                  className="text-button event-actions__text-button"
                  onClick={handleCancelRound}
                  disabled={!canCancel}
                >
                  Avbryt
                </button>
              </div>
              <div className="event-actions__slot event-actions__slot--center">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleMoveToTeammateSelection}
                  disabled={!canAddTeammate}
                >
                  Legg til lagkamerat
                </button>
              </div>
              <div className="event-actions__slot event-actions__slot--end">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleContinueToPresentation}
                  disabled={!canContinueSolo}
                >
                  Fortsett alene
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {round?.step === 'teammate' ? (
        <div className="event-stage event-stage--wheel">
          <div className="event-results-grid">
            <RoundResult
              label="På lag med"
              value={round.primaryParticipantName ?? 'Ukjent deltaker'}
            />
            {hasTeammateParticipant ? (
              <RoundResult label="Valgt lag" value={teamName} />
            ) : null}
          </div>
          <Wheel
            ariaLabel="Hjul med tilgjengelige lagkamerater"
            items={availableTeammates.map((participant) => ({
              id: participant.id,
              label: participant.name,
            }))}
            rotation={participantRotation}
            spinning={pendingSpin?.phase === 'teammate'}
            winnerIndex={currentParticipantWinnerIndex}
            emptyLabel="Ingen lagkamerater igjen"
            onSpinEnd={handleTeammateSpinEnd}
          />

          {!hasTeammateParticipant ? (
            <>
              <p className="placeholder-copy event-stage__copy">
                {availableTeammates.length === 0
                  ? 'Ingen tilgjengelig lagkamerat finnes akkurat nå. Du kan fortsette alene eller avbryte runden.'
                  : `Velg en lagkamerat for ${round.primaryParticipantName ?? 'deltakeren'}.`}
              </p>
              <div className="event-actions">
                <div className="event-actions__grid">
                  <div className="event-actions__slot event-actions__slot--start">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleRemoveTeammate}
                    >
                      Fortsett alene
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--center">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleSpinTeammate}
                      disabled={!canSpinTeammate}
                    >
                      Spinn hjulet
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--end">
                    <button
                      type="button"
                      className="text-button event-actions__text-button"
                      onClick={handleCancelRound}
                      disabled={!canCancel}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="event-actions event-actions--participant">
              <div className="event-actions__utility">
                <button
                  type="button"
                  className="ghost-button event-actions__utility-button"
                  onClick={handleSpinTeammate}
                  disabled={!canSpinTeammate}
                >
                  Spinn lagkamerat på nytt
                </button>
                <button
                  type="button"
                  className="text-button event-actions__text-button"
                  onClick={handleCancelRound}
                  disabled={!canCancel}
                >
                  Avbryt
                </button>
              </div>
              <div className="event-actions__grid">
                <div className="event-actions__slot event-actions__slot--start">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleRemoveTeammate}
                  >
                    Fjern lagkamerat
                  </button>
                </div>
                <div className="event-actions__slot event-actions__slot--center" aria-hidden="true" />
                <div className="event-actions__slot event-actions__slot--end">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleContinueToPresentation}
                    disabled={!canContinueWithTeammate}
                  >
                    Fortsett til presentasjon
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {round?.step === 'presentation' ? (
        <div className="event-stage event-stage--wheel">
          <RoundResult label={participantLabel} value={teamName} />
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
              <div className="event-actions">
                <div className="event-actions__grid">
                  <div className="event-actions__slot event-actions__slot--start">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleBackToParticipantPhase}
                      disabled={isSpinning}
                    >
                      Tilbake
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--center">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleSpinPresentation}
                      disabled={!canSpinPresentation}
                    >
                      Spinn hjulet
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--end">
                    <button
                      type="button"
                      className="text-button event-actions__text-button"
                      onClick={handleCancelRound}
                      disabled={!canCancel}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <RoundResult
                label="Valgt presentasjon"
                value={round.presentationTitle ?? 'Ukjent presentasjon'}
                secondary={presentationHost}
              />
              <div className="event-actions event-actions--presentation">
                <div className="event-actions__utility">
                  <button
                    type="button"
                    className="ghost-button event-actions__utility-button"
                    onClick={handleSpinPresentation}
                    disabled={!canSpinPresentation}
                  >
                    Spinn på nytt
                  </button>
                  <button
                    type="button"
                    className="text-button event-actions__text-button"
                    onClick={handleCancelRound}
                    disabled={!canCancel}
                  >
                    Avbryt
                  </button>
                </div>
                <div className="event-actions__grid event-actions__grid--presentation">
                  <div className="event-actions__slot event-actions__slot--start">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleBackToParticipantPhase}
                      disabled={isSpinning}
                    >
                      Tilbake
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--center">
                    {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
                  </div>
                  <div className="event-actions__slot event-actions__slot--end">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleContinueToConfirm}
                      disabled={!isPresentationSelected}
                    >
                      Fortsett
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {round?.step === 'confirm' ? (
        <div className="event-stage">
          <div className="event-results-grid">
            <RoundResult label={participantLabel} value={teamName} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={presentationHost}
            />
          </div>
          <div className="event-actions event-actions--presentation">
            <div className="event-actions__utility">
              <button
                type="button"
                className="text-button event-actions__text-button"
                onClick={handleCancelRound}
                disabled={!canCancel}
              >
                Avbryt
              </button>
            </div>
            <div className="event-actions__grid event-actions__grid--presentation">
              <div className="event-actions__slot event-actions__slot--start">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleBackToPresentation}
                  disabled={isSpinning}
                >
                  Tilbake
                </button>
              </div>
              <div className="event-actions__slot event-actions__slot--center">
                {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
              </div>
              <div className="event-actions__slot event-actions__slot--end">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleConfirmRound}
                  disabled={!canConfirmRound}
                >
                  Bekreft runde
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {round?.step === 'penalty' ? (
        <div className="event-stage event-stage--wheel">
          <div className="event-results-grid">
            <RoundResult label={participantLabel} value={teamName} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={presentationHost}
            />
          </div>
          <Wheel
            ariaLabel="Hjul med tilgjengelige straffer"
            items={availablePenalties.map((penalty) => ({
              id: penalty.id,
              label: penalty.title,
            }))}
            rotation={penaltyRotation}
            spinning={pendingSpin?.phase === 'penalty'}
            winnerIndex={currentPenaltyWinnerIndex}
            emptyLabel="Ingen straffer igjen"
            onSpinEnd={handlePenaltySpinEnd}
          />

          {!hasPenalty ? (
            <>
              <p className="placeholder-copy event-stage__copy">
                {availablePenalties.length === 0
                  ? 'Ingen straffer er tilgjengelige akkurat nå. Du kan gå tilbake til den fullførte runden.'
                  : `Trekk en straff for ${teamName}.`}
              </p>
              <div className="event-actions">
                <div className="event-actions__grid">
                  <div className="event-actions__slot event-actions__slot--start">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleCancelRound}
                    >
                      Avbryt
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--center">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleSpinPenalty}
                      disabled={!canSpinPenalty}
                    >
                      Spinn hjulet
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--end" aria-hidden="true" />
                </div>
              </div>
            </>
          ) : (
            <>
              <RoundResult
                label="Valgt straff"
                value={round.penaltyTitle ?? 'Ukjent straff'}
                secondary={round.penaltyDescription}
              />
              <div className="event-actions event-actions--presentation">
                <div className="event-actions__utility">
                  <button
                    type="button"
                    className="ghost-button event-actions__utility-button"
                    onClick={handleSpinPenalty}
                    disabled={!canSpinPenalty}
                  >
                    Spinn på nytt
                  </button>
                </div>
                <div className="event-actions__grid event-actions__grid--presentation">
                  <div className="event-actions__slot event-actions__slot--start">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={handleCancelRound}
                    >
                      Avbryt
                    </button>
                  </div>
                  <div className="event-actions__slot event-actions__slot--center" aria-hidden="true" />
                  <div className="event-actions__slot event-actions__slot--end">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={handleConfirmPenalty}
                      disabled={!canConfirmPenalty}
                    >
                      Bekreft straff
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {round?.step === 'complete' ? (
        <div className="event-stage">
          <div className="event-results-grid">
            <RoundResult label={participantLabel} value={teamName} />
            <RoundResult
              label="Presentasjon"
              value={round.presentationTitle ?? 'Ukjent presentasjon'}
              secondary={presentationHost}
            />
          </div>
          {hasPenalty ? (
            <RoundResult
              label="Straff"
              value={round.penaltyTitle ?? 'Ukjent straff'}
              secondary={round.penaltyDescription}
            />
          ) : (
            <p className="placeholder-copy event-stage__copy">
              Runden er bekreftet og lagret. Alle deltakere i laget og presentasjonen er nå markert som brukt.
            </p>
          )}
          {!hasPenalty && availablePenalties.length === 0 ? (
            <p className="event-actions__hint">Ingen straffer er tilgjengelige.</p>
          ) : null}
          <div className="event-actions">
            <div className="event-actions__grid event-actions__grid--complete">
              <div className="event-actions__slot event-actions__slot--start">
                {hasPenalty ? (
                  <span aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleMoveToPenaltySelection}
                    disabled={!canMoveToPenalty}
                  >
                    Spinn straffehjul
                  </button>
                )}
              </div>
              <div className="event-actions__slot event-actions__slot--center">
                {renderPresentationOpenAction(round.presentationUrl, handleOpenPresentation)}
              </div>
              <div className="event-actions__slot event-actions__slot--end">
                <button type="button" className="primary-button" onClick={handleStartNextRound}>
                  Start neste runde
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function getHeading(round: AppState['currentRound']) {
  if (round?.step === 'teammate') {
    return 'Velg lagkamerat'
  }

  if (round?.step === 'presentation') {
    return 'Velg presentasjon'
  }

  if (round?.step === 'confirm') {
    return 'Bekreft runden'
  }

  if (round?.step === 'penalty') {
    return 'Straffehjul'
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
    currentStep === 'participant' || currentStep === 'teammate'
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

function getCurrentParticipantWinnerId(
  round: AppState['currentRound'],
  pendingSpin: PendingSpinState | null,
): string | null {
  if (pendingSpin?.phase === 'primary' || pendingSpin?.phase === 'teammate') {
    return pendingSpin.winnerId
  }

  if (round?.step === 'teammate') {
    return round.teammateParticipantId
  }

  return round?.primaryParticipantId ?? null
}

function hasPrimarySelection(round: AppState['currentRound']) {
  return round?.primaryParticipantId !== null && round?.primaryParticipantName !== null
}

function hasTeammateSelection(round: AppState['currentRound']) {
  return round?.teammateParticipantId !== null && round?.teammateParticipantName !== null
}

function hasPresentationSelection(round: AppState['currentRound']) {
  return (
    round?.presentationId !== null &&
    round?.presentationTitle !== null &&
    round?.presentationUrl !== null
  )
}

function hasPenaltySelection(round: AppState['currentRound']) {
  return round?.penaltyId !== null && round?.penaltyTitle !== null
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
      className="primary-button primary-button--link event-open-button"
      onClick={(event) => onOpen(event, presentationUrl)}
      aria-disabled={!isValidUrl}
    >
      Åpne presentasjon ↗
    </a>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="event-page__icon">
      <path
        d="M4 10.75 12 4l8 6.75v8.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75V15h-4v4.25a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 4 19.25z"
        fill="currentColor"
      />
    </svg>
  )
}

export default EventPage
