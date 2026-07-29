import { useState } from 'react'

import type { ValidationResult } from '../types/app'
import type { EntityId, Presentation } from '../types/domain'
import ConfirmationDialog from './ConfirmationDialog'

interface PresentationManagerProps {
  presentations: Presentation[]
  onAddPresentation: (title: string, url: string) => ValidationResult<Presentation>
  onBulkAddPresentations: (input: string) => ValidationResult<Presentation[]>
  onUpdatePresentation: (
    presentationId: EntityId,
    title: string,
    url: string,
  ) => ValidationResult<{
    title: string
    url: string
  }>
  onDeletePresentation: (presentationId: EntityId) => void
  onSetPresentationActive: (presentationId: EntityId, isActive: boolean) => void
  onRestorePresentation: (presentationId: EntityId) => void
}

function PresentationManager({
  presentations,
  onAddPresentation,
  onBulkAddPresentations,
  onUpdatePresentation,
  onDeletePresentation,
  onSetPresentationActive,
  onRestorePresentation,
}: PresentationManagerProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [editingId, setEditingId] = useState<EntityId | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Presentation | null>(null)

  function handleAddPresentation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onAddPresentation(title, url)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setTitle('')
    setUrl('')
    setFormErrors([])
  }

  function handleBulkAddPresentations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onBulkAddPresentations(bulkInput)

    if (!result.success) {
      setFormErrors(result.errors)
      return
    }

    setBulkInput('')
    setFormErrors([])
  }

  function beginEdit(presentation: Presentation) {
    setEditingId(presentation.id)
    setEditingTitle(presentation.title)
    setEditingUrl(presentation.url)
    setEditErrors([])
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
    setEditingUrl('')
    setEditErrors([])
  }

  function handleSavePresentation(presentationId: EntityId) {
    const result = onUpdatePresentation(presentationId, editingTitle, editingUrl)

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
          <h3>Presentasjoner</h3>
          <p className="soft-panel__subtle">Tittel, lenke og status samlet i en enkel liste.</p>
        </div>
        <span className="count-chip">{presentations.length}</span>
      </div>

      {formErrors.length > 0 ? (
        <MessageList className="notice notice--error" title="Kunne ikke lagre" messages={formErrors} />
      ) : null}

      <form className="stack-form" onSubmit={handleAddPresentation}>
        <div className="field">
          <label htmlFor="presentation-title">Tittel</label>
          <input
            id="presentation-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For eksempel Verdensrommet"
          />
        </div>

        <div className="field">
          <label htmlFor="presentation-url">Lenke</label>
          <input
            id="presentation-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/presentasjon"
          />
        </div>

        <div className="button-row">
          <button type="submit" className="ghost-button">
            Legg til presentasjon
          </button>
        </div>
      </form>

      <details className="bulk-panel">
        <summary>Legg til flere presentasjoner</summary>
        <form className="bulk-panel__content" onSubmit={handleBulkAddPresentations}>
          <div className="field">
            <label htmlFor="presentation-bulk">Bruk formatet Tittel | URL</label>
            <textarea
              id="presentation-bulk"
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
              placeholder={'Verdensrommet | https://example.com/rom\nKatter | https://example.com/katter'}
            />
          </div>

          <div className="button-row">
            <button type="submit" className="ghost-button">
              Legg til listen
            </button>
          </div>
        </form>
      </details>

      {presentations.length === 0 ? (
        <p className="empty-state">Ingen presentasjoner lagt til ennå.</p>
      ) : (
        <ul className="entity-list">
          {presentations.map((presentation) => {
            const isEditing = editingId === presentation.id

            return (
              <li key={presentation.id} className="entity-card">
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
                      <label htmlFor={`presentation-title-${presentation.id}`}>Tittel</label>
                      <input
                        id={`presentation-title-${presentation.id}`}
                        type="text"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                      />
                    </div>

                    <div className="field">
                      <label htmlFor={`presentation-url-${presentation.id}`}>Lenke</label>
                      <input
                        id={`presentation-url-${presentation.id}`}
                        type="url"
                        value={editingUrl}
                        onChange={(event) => setEditingUrl(event.target.value)}
                      />
                    </div>

                    <div className="button-row">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleSavePresentation(presentation.id)}
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
                        <strong>{presentation.title}</strong>
                        <a
                          href={presentation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="entity-link"
                        >
                          {presentation.url}
                        </a>
                      </div>
                      <span className={`status-badge ${getStatusToneClass(presentation)}`}>
                        {getStatusLabel(presentation)}
                      </span>
                    </div>

                    <div className="entity-card__actions">
                      {presentation.isUsed ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onRestorePresentation(presentation.id)}
                        >
                          Gjenopprett
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => onSetPresentationActive(presentation.id, !presentation.isActive)}
                      >
                        {presentation.isActive ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => beginEdit(presentation)}
                      >
                        Rediger
                      </button>
                      <button
                        type="button"
                        className="text-button text-button--danger"
                        onClick={() => setPendingDelete(presentation)}
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
          title="Slett presentasjon?"
          message={`"${pendingDelete.title}" blir fjernet helt fra oppsettet.`}
          confirmLabel="Slett presentasjon"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeletePresentation(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      ) : null}
    </section>
  )
}

function getStatusLabel(presentation: Presentation) {
  if (!presentation.isActive) {
    return 'Deaktivert'
  }

  if (presentation.isUsed) {
    return 'Brukt'
  }

  return 'Tilgjengelig'
}

function getStatusToneClass(presentation: Presentation) {
  if (!presentation.isActive) {
    return 'status-badge--inactive'
  }

  if (presentation.isUsed) {
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

export default PresentationManager
