export type EventShortcutAction =
  | 'spin'
  | 'advance'
  | 'confirm'
  | 'cancel'
  | 'exit-fullscreen'
  | null

export interface EventShortcutContext {
  key: string
  isRepeat: boolean
  isEditableTarget: boolean
  isFullscreen: boolean
  canSpin: boolean
  canAdvance: boolean
  canConfirm: boolean
  canCancel: boolean
}

export interface EventShortcutDecision {
  action: EventShortcutAction
  preventDefault: boolean
}

export function getEventShortcutDecision(
  context: EventShortcutContext,
): EventShortcutDecision {
  if (context.isRepeat || context.isEditableTarget) {
    return {
      action: null,
      preventDefault: false,
    }
  }

  if (context.key === ' ' || context.key === 'Spacebar') {
    return {
      action: context.canSpin ? 'spin' : null,
      preventDefault: context.canSpin,
    }
  }

  if (context.key === 'Enter') {
    if (context.canConfirm) {
      return {
        action: 'confirm',
        preventDefault: true,
      }
    }

    if (context.canAdvance) {
      return {
        action: 'advance',
        preventDefault: true,
      }
    }

    return {
      action: null,
      preventDefault: false,
    }
  }

  if (context.key === 'Escape') {
    if (context.canCancel) {
      return {
        action: 'cancel',
        preventDefault: true,
      }
    }

    if (context.isFullscreen) {
      return {
        action: 'exit-fullscreen',
        preventDefault: true,
      }
    }
  }

  return {
    action: null,
    preventDefault: false,
  }
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true
  }

  return target.closest('[contenteditable="true"]') !== null
}
