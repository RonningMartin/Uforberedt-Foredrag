import { useEffect } from 'react'

import {
  getEventShortcutDecision,
  isEditableShortcutTarget,
} from '../utils/eventShortcuts'

interface UseEventKeyboardShortcutsOptions {
  enabled: boolean
  isFullscreen: boolean
  canSpin: boolean
  canAdvance: boolean
  canConfirm: boolean
  canCancel: boolean
  onSpin: () => void
  onAdvance: () => void
  onConfirm: () => void
  onCancel: () => void
  onExitFullscreen: () => void
}

export function useEventKeyboardShortcuts(options: UseEventKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!options.enabled) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      const decision = getEventShortcutDecision({
        key: event.key,
        isRepeat: event.repeat,
        isEditableTarget: isEditableShortcutTarget(event.target),
        isFullscreen: options.isFullscreen,
        canSpin: options.canSpin,
        canAdvance: options.canAdvance,
        canConfirm: options.canConfirm,
        canCancel: options.canCancel,
      })

      if (decision.action === null) {
        return
      }

      if (decision.preventDefault) {
        event.preventDefault()
      }

      if (decision.action === 'spin') {
        options.onSpin()
        return
      }

      if (decision.action === 'advance') {
        options.onAdvance()
        return
      }

      if (decision.action === 'confirm') {
        options.onConfirm()
        return
      }

      if (decision.action === 'cancel') {
        options.onCancel()
        return
      }

      options.onExitFullscreen()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [options])
}
