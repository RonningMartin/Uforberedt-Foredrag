import { useState } from 'react'

import type { ValidationResult } from '../types/app'
import type { EntityId, Participant } from '../types/domain'
import ConfirmationDialog from './ConfirmationDialog'

interface ParticipantManagerProps {
  participants: Participant[]
  onAddParticipant: (name: string) => ValidationResult<Participant>
  onBulkAddParticipants: (input: string) => ValidationResult<Participant[]>
  onUpdateParticipant: (participantId: EntityId, name: string) => ValidationResult<string>
  onDeleteParticipant: (participantId: EntityId) => void
  onSetParticipantActive: (participantId: EntityId, isActive: boolean) => void
  onRestoreParticipant: (participantId: EntityId) => void
}

function ParticipantManager({
  participants,
  onAddParticipant,
  onBulkAddParticipants,
  onUpdateParticipant,
  onDeleteParticipant,
  onSetParticipantActive,
  onRestoreParticipant,
}: ParticipantManagerProps) {
  const [name, setName] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [editingId, setEditingId] = useState<EntityId | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Participant | null>(null)

  function handleAddParticipant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onAddParticipant(name)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setName('')
    setFormErrors([])
  }

  function handleBulkAddParticipants(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onBulkAddParticipants(bulkInput)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setBulkInput('')
    setFormErrors([])
  }

  function beginEdit(participant: Participant) {
    setEditingId(participant.id)
    setEditingName(participant.name)
    setEditErrors([])
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
    setEditErrors([])
  }

  function handleSaveParticipant(participantId: EntityId) {
    const result = onUpdateParticipant(participantId, editingName)

    if (!result.success) {
      setEditErrors(result.errors)
      return
    }

    cancelEdit()
  }

  return (
    <section className="soft-panel soft-panel--manager">
      <div className="soft-panel__header">
        <div>
          <h3>Deltakere</h3>
          <p className="soft-panel__subtle">Navn, status og raske endringer på ett sted.</p>
        </div>
        <span className="count-chip">{participants.length}</span>
      </div>

      {formErrors.length > 0 ? (
        <MessageList className="notice notice--error" title="Kunne ikke lagre" messages={formErrors} />
      ) : null}

      <form className="form-row" onSubmit={handleAddParticipant}>
        <div className="field">
          <label htmlFor="participant-name">Legg til deltaker</label>
          <input
            id="participant-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="For eksempel Ola Nordmann"
          />
        </div>

        <button type="submit" className="ghost-button">
          Legg til
        </button>
      </form>

      <details className="bulk-panel">
        <summary>Legg til flere deltakere</summary>
        <form className="bulk-panel__content" onSubmit={handleBulkAddParticipants}>
          <div className="field">
            <label htmlFor="participant-bulk">Ett navn per linje</label>
            <textarea
              id="participant-bulk"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={'Ola\nKari\nPer'}
            />
          </div>

          <div className="button-row">
            <button type="submit" className="ghost-button">
              Legg til listen
            </button>
          </div>
        </form>
      </details>

      {participants.length === 0 ? (
        <p className="empty-state">Ingen deltakere lagt til ennå.</p>
      ) : (
        <ul className="entity-list">
          {participants.map((participant) => {
            const isEditing = editingId === participant.id

            return (
              <li key={participant.id} className="entity-card">
                {isEditing ? (
                  <div className="entity-card__edit">
                    {editErrors.length > 0 ? (
                      <MessageList
                        className="notice notice--error"
                        title="Kunne ikke lagre"
                        messages={editErrors}
                      />
                    ) : null}

                    <div className="field">
                      <label htmlFor={`participant-edit-${participant.id}`}>Navn</label>
                      <input
                        id={`participant-edit-${participant.id}`}
                        type="text"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                    </div>

                    <div className="button-row">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleSaveParticipant(participant.id)}
                      >
                        Lagre
                      </button>
                      <button type="button" className="text-button" onClick={cancelEdit}>
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="entity-card__header">
                      <div className="entity-card__content">
                        <strong>{participant.name}</strong>
                      </div>
                      <span className={`status-badge ${getStatusToneClass(participant)}`}>
                        {getStatusLabel(participant)}
                      </span>
                    </div>

                    <div className="entity-card__actions">
                      {participant.isUsed ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onRestoreParticipant(participant.id)}
                        >
                          Gjenopprett
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onSetParticipantActive(participant.id, !participant.isActive)}
                      >
                        {participant.isActive ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => beginEdit(participant)}
                      >
                        Rediger
                      </button>
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={() => setPendingDelete(participant)}
                      >
                        Slett
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {pendingDelete !== null ? (
        <ConfirmationDialog
          title="Slett deltaker?"
          message={`"${pendingDelete.name}" blir fjernet helt fra oppsettet.`}
          confirmLabel="Slett deltaker"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteParticipant(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      ) : null}
    </section>
  )
}

function getStatusLabel(participant: Participant) {
  if (!participant.isActive) {
    return 'Deaktivert'
  }

  if (participant.isUsed) {
    return 'Brukt'
  }

  return 'Tilgjengelig'
}

function getStatusToneClass(participant: Participant) {
  if (!participant.isActive) {
    return 'status-badge--inactive'
  }

  if (participant.isUsed) {
    return 'status-badge--used'
  }

  return 'status-badge--available'
}

interface MessageListProps {
  className: string
  title: string
  messages: string[]
}

function MessageList({ className, title, messages }: MessageListProps) {
  return (
    <div className={className} role="alert">
      <strong>{title}</strong>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

export default ParticipantManager
