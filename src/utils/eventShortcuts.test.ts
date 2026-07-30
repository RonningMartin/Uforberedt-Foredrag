// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import {
  getEventShortcutDecision,
  isEditableShortcutTarget,
} from './eventShortcuts'

describe('eventShortcuts', () => {
  it('maps active keyboard shortcuts to the expected actions', () => {
    expect(
      getEventShortcutDecision({
        key: ' ',
        isRepeat: false,
        isEditableTarget: false,
        isFullscreen: false,
        canSpin: true,
        canAdvance: false,
        canConfirm: false,
        canCancel: false,
      }),
    ).toEqual({
      action: 'spin',
      preventDefault: true,
    })

    expect(
      getEventShortcutDecision({
        key: 'Enter',
        isRepeat: false,
        isEditableTarget: false,
        isFullscreen: false,
        canSpin: false,
        canAdvance: true,
        canConfirm: false,
        canCancel: false,
      }),
    ).toEqual({
      action: 'advance',
      preventDefault: true,
    })

    expect(
      getEventShortcutDecision({
        key: 'Escape',
        isRepeat: false,
        isEditableTarget: false,
        isFullscreen: true,
        canSpin: false,
        canAdvance: false,
        canConfirm: false,
        canCancel: false,
      }),
    ).toEqual({
      action: 'exit-fullscreen',
      preventDefault: true,
    })
  })

  it('ignores repeated presses and editable targets', () => {
    expect(
      getEventShortcutDecision({
        key: ' ',
        isRepeat: true,
        isEditableTarget: false,
        isFullscreen: false,
        canSpin: true,
        canAdvance: false,
        canConfirm: false,
        canCancel: false,
      }),
    ).toEqual({
      action: null,
      preventDefault: false,
    })

    const input = document.createElement('input')
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')

    expect(isEditableShortcutTarget(input)).toBe(true)
    expect(isEditableShortcutTarget(div)).toBe(true)
    expect(isEditableShortcutTarget(document.createElement('button'))).toBe(false)
  })
})
