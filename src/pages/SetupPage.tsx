import type { Dispatch } from 'react'

import PenaltyManager from '../components/PenaltyManager'
import ParticipantManager from '../components/ParticipantManager'
import PresentationManager from '../components/PresentationManager'
import { getAppStats } from '../state/appState'
import type { AppAction, AppState, ValidationResult } from '../types/app'
import type { EntityId, Participant, Penalty, Presentation } from '../types/domain'
import {
  createParticipant,
  createPenalty,
  createPresentation,
  parsePenaltyBulkInput,
  parseParticipantBulkInput,
  parsePresentationBulkInput,
  validatePenaltyInput,
  validateParticipantName,
  validatePresentationInput,
} from '../utils/setupValidation'

interface SetupPageProps {
  state: AppState
  dispatch: Dispatch<AppAction>
}

function SetupPage({ state, dispatch }: SetupPageProps) {
  const stats = getAppStats(state)

  function handleAddParticipant(name: string): ValidationResult<Participant> {
    const result = createParticipant(name, state.participants)

    if (result.success) {
      dispatch({
        type: 'addParticipant',
        participant: result.data,
      })
    }

    return result
  }

  function handleBulkAddParticipants(input: string): ValidationResult<Participant[]> {
    const result = parseParticipantBulkInput(input, state.participants)

    if (result.success) {
      dispatch({
        type: 'addParticipants',
        participants: result.data,
      })
    }

    return result
  }

  function handleUpdateParticipant(
    participantId: EntityId,
    name: string,
  ): ValidationResult<string> {
    const result = validateParticipantName(name, state.participants, participantId)

    if (result.success) {
      dispatch({
        type: 'updateParticipant',
        participantId,
        name: result.data,
      })
    }

    return result
  }

  function handleAddPresentation(title: string, url: string): ValidationResult<Presentation> {
    const result = createPresentation({ title, url }, state.presentations)

    if (result.success) {
      dispatch({
        type: 'addPresentation',
        presentation: result.data,
      })
    }

    return result
  }

  function handleAddPenalty(title: string, description: string): ValidationResult<Penalty> {
    const result = createPenalty({ title, description }, state.penalties)

    if (result.success) {
      dispatch({
        type: 'addPenalty',
        penalty: result.data,
      })
    }

    return result
  }

  function handleBulkAddPenalties(input: string): ValidationResult<Penalty[]> {
    const result = parsePenaltyBulkInput(input, state.penalties)

    if (result.success) {
      dispatch({
        type: 'addPenalties',
        penalties: result.data,
      })
    }

    return result
  }

  function handleUpdatePenalty(
    penaltyId: EntityId,
    title: string,
    description: string,
  ): ValidationResult<{
    title: string
    description: string | null
  }> {
    const result = validatePenaltyInput({ title, description }, state.penalties, penaltyId)

    if (result.success) {
      dispatch({
        type: 'updatePenalty',
        penaltyId,
        title: result.data.title,
        description: result.data.description,
      })
    }

    return result
  }

  function handleBulkAddPresentations(input: string): ValidationResult<Presentation[]> {
    const result = parsePresentationBulkInput(input, state.presentations)

    if (result.success) {
      dispatch({
        type: 'addPresentations',
        presentations: result.data,
      })
    }

    return result
  }

  function handleUpdatePresentation(
    presentationId: EntityId,
    title: string,
    url: string,
  ): ValidationResult<{
    title: string
    url: string
  }> {
    const result = validatePresentationInput({ title, url }, state.presentations, presentationId)

    if (result.success) {
      dispatch({
        type: 'updatePresentation',
        presentationId,
        title: result.data.title,
        url: result.data.url,
      })
    }

    return result
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Oppsett</p>
          <h2>Gjør klart arrangementet</h2>
        </div>
        <p className="status-line">
          {formatCount(stats.participants.available, 'deltaker', 'deltakere')} tilgjengelige ·{' '}
          {formatCount(stats.presentations.available, 'presentasjon', 'presentasjoner')} tilgjengelige ·{' '}
          {formatCount(stats.penalties.available, 'straff', 'straffer')} tilgjengelige
        </p>
      </div>

      <div className="setup-grid">
        <ParticipantManager
          participants={state.participants}
          onAddParticipant={handleAddParticipant}
          onBulkAddParticipants={handleBulkAddParticipants}
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteParticipant={(participantId) =>
            dispatch({
              type: 'deleteParticipant',
              participantId,
            })
          }
          onSetParticipantActive={(participantId, isActive) =>
            dispatch({
              type: 'setParticipantActive',
              participantId,
              isActive,
            })
          }
          onRestoreParticipant={(participantId) =>
            dispatch({
              type: 'restoreParticipant',
              participantId,
            })
          }
        />

        <PresentationManager
          presentations={state.presentations}
          onAddPresentation={handleAddPresentation}
          onBulkAddPresentations={handleBulkAddPresentations}
          onUpdatePresentation={handleUpdatePresentation}
          onDeletePresentation={(presentationId) =>
            dispatch({
              type: 'deletePresentation',
              presentationId,
            })
          }
          onSetPresentationActive={(presentationId, isActive) =>
            dispatch({
              type: 'setPresentationActive',
              presentationId,
              isActive,
            })
          }
          onRestorePresentation={(presentationId) =>
            dispatch({
              type: 'restorePresentation',
              presentationId,
            })
          }
        />

        <PenaltyManager
          penalties={state.penalties}
          onAddPenalty={handleAddPenalty}
          onBulkAddPenalties={handleBulkAddPenalties}
          onUpdatePenalty={handleUpdatePenalty}
          onDeletePenalty={(penaltyId) =>
            dispatch({
              type: 'deletePenalty',
              penaltyId,
            })
          }
          onSetPenaltyActive={(penaltyId, isActive) =>
            dispatch({
              type: 'setPenaltyActive',
              penaltyId,
              isActive,
            })
          }
          onRestorePenalty={(penaltyId) =>
            dispatch({
              type: 'restorePenalty',
              penaltyId,
            })
          }
        />
      </div>

      <div className="panel-footer">
        <button
          type="button"
          className="primary-button"
          onClick={() =>
            dispatch({
              type: 'navigate',
              view: 'event',
            })
          }
        >
          Start arrangement
        </button>
      </div>
    </section>
  )
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default SetupPage
