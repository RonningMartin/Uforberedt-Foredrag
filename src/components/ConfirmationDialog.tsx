interface ConfirmationDialogAction {
  label: string
  tone?: 'ghost' | 'primary' | 'danger'
  onAction: () => void
}

interface ConfirmationDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  actions?: ConfirmationDialogAction[]
  onCancel: () => void
}

function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Avbryt',
  onConfirm,
  actions,
  onCancel,
}: ConfirmationDialogProps) {
  const visibleActions =
    actions ?? (confirmLabel !== undefined && onConfirm !== undefined
      ? [
          {
            label: confirmLabel,
            tone: 'danger' as const,
            onAction: onConfirm,
          },
        ]
      : [])

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{title}</h2>
        <p>{message}</p>

        <div className="dialog__actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          {visibleActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={getActionClassName(action.tone)}
              onClick={action.onAction}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function getActionClassName(tone: ConfirmationDialogAction['tone']) {
  if (tone === 'ghost') {
    return 'ghost-button'
  }

  if (tone === 'primary') {
    return 'primary-button'
  }

  return 'danger-button'
}

export default ConfirmationDialog
