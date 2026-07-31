import { useState } from 'react'

import type { ValidationResult } from '../types/app'
import type { EntityId, Penalty } from '../types/domain'
import ConfirmationDialog from './ConfirmationDialog'

interface PenaltyManagerProps {
  penalties: Penalty[]
  onAddPenalty: (title: string, description: string) => ValidationResult<Penalty>
  onBulkAddPenalties: (input: string) => ValidationResult<Penalty[]>
  onUpdatePenalty: (
    penaltyId: EntityId,
    title: string,
    description: string,
  ) => ValidationResult<{
    title: string
    description: string | null
  }>
  onDeletePenalty: (penaltyId: EntityId) => void
  onSetPenaltyActive: (penaltyId: EntityId, isActive: boolean) => void
  onRestorePenalty: (penaltyId: EntityId) => void
}

function PenaltyManager({
  penalties,
  onAddPenalty,
  onBulkAddPenalties,
  onUpdatePenalty,
  onDeletePenalty,
  onSetPenaltyActive,
  onRestorePenalty,
}: PenaltyManagerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [editingId, setEditingId] = useState<EntityId | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Penalty | null>(null)

  function handleAddPenalty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onAddPenalty(title, description)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setTitle('')
    setDescription('')
    setFormErrors([])
  }

  function handleBulkAddPenalties(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onBulkAddPenalties(bulkInput)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setBulkInput('')
    setFormErrors([])
  }

  function beginEdit(penalty: Penalty) {
    setEditingId(penalty.id)
    setEditingTitle(penalty.title)
    setEditingDescription(penalty.description ?? '')
    setEditErrors([])
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
    setEditingDescription('')
    setEditErrors([])
  }

  function handleSavePenalty(penaltyId: EntityId) {
    const result = onUpdatePenalty(penaltyId, editingTitle, editingDescription)

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
          <h3>Straffer</h3>
          <p className="soft-panel__subtle">Valgfrie straffer som kan trekkes etter en bekreftet runde.</p>
        </div>
        <span className="count-chip">{penalties.length}</span>
      </div>

      {formErrors.length > 0 ? (
        <MessageList className="notice notice--error" title="Kunne ikke lagre" messages={formErrors} />
      ) : null}

      <form className="stack-form" onSubmit={handleAddPenalty}>
        <div className="field">
          <label htmlFor="penalty-title">Straff</label>
          <input
            id="penalty-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For eksempel Syng første vers av en sang"
          />
        </div>

        <div className="field">
          <label htmlFor="penalty-description">Beskrivelse (valgfritt)</label>
          <textarea
            id="penalty-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Legg til en kort forklaring hvis det trengs."
          />
        </div>

        <div className="button-row">
          <button type="submit" className="ghost-button">
            Legg til straff
          </button>
        </div>
      </form>

      <details className="bulk-panel">
        <summary>Legg til flere straffer</summary>
        <form className="bulk-panel__content" onSubmit={handleBulkAddPenalties}>
          <div className="field">
            <label htmlFor="penalty-bulk">En straff per linje</label>
            <textarea
              id="penalty-bulk"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={'Ta 10 armhevinger\nSyng en sang\nFortell en pinlig historie'}
            />
          </div>

          <div className="button-row">
            <button type="submit" className="ghost-button">
              Legg til listen
            </button>
          </div>
        </form>
      </details>

      {penalties.length === 0 ? (
        <p className="empty-state">Ingen straffer lagt til ennå.</p>
      ) : (
        <ul className="entity-list">
          {penalties.map((penalty) => {
            const isEditing = editingId === penalty.id

            return (
              <li key={penalty.id} className="entity-card">
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
                      <label htmlFor={`penalty-title-${penalty.id}`}>Straff</label>
                      <input
                        id={`penalty-title-${penalty.id}`}
                        type="text"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor={`penalty-description-${penalty.id}`}>Beskrivelse</label>
                      <textarea
                        id={`penalty-description-${penalty.id}`}
                        value={editingDescription}
                        onChange={(event) => setEditingDescription(event.target.value)}
                      />
                    </div>

                    <div className="button-row">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleSavePenalty(penalty.id)}
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
                        <strong>{penalty.title}</strong>
                        {penalty.description ? (
                          <p className="entity-card__copy">{penalty.description}</p>
                        ) : null}
                      </div>
                      <span className={`status-badge ${getStatusToneClass(penalty)}`}>
                        {getStatusLabel(penalty)}
                      </span>
                    </div>

                    <div className="entity-card__actions">
                      {penalty.isUsed ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onRestorePenalty(penalty.id)}
                        >
                          Gjenopprett
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onSetPenaltyActive(penalty.id, !penalty.isActive)}
                      >
                        {penalty.isActive ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => beginEdit(penalty)}
                      >
                        Rediger
                      </button>
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={() => setPendingDelete(penalty)}
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
          title="Slett straff?"
          message={`"${pendingDelete.title}" blir fjernet helt fra oppsettet.`}
          confirmLabel="Slett straff"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeletePenalty(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      ) : null}
    </section>
  )
}

function getStatusLabel(penalty: Penalty) {
  if (!penalty.isActive) {
    return 'Deaktivert'
  }

  if (penalty.isUsed) {
    return 'Brukt'
  }

  return 'Tilgjengelig'
}

function getStatusToneClass(penalty: Penalty) {
  if (!penalty.isActive) {
    return 'status-badge--inactive'
  }

  if (penalty.isUsed) {
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

export default PenaltyManager
