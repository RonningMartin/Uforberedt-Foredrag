import { describe, expect, it, vi } from 'vitest'

import { getPresentationHost, openPresentationUrl } from './presentationLink'

describe('presentationLink', () => {
  it('opens a valid presentation URL in a new tab safely', () => {
    const openedWindow = { opener: null } as unknown as Window
    const openWindow = vi.fn(() => openedWindow)

    expect(openPresentationUrl('https://docs.google.com/presentation/d/123', openWindow)).toEqual({
      success: true,
    })
    expect(openWindow).toHaveBeenCalledWith(
      'https://docs.google.com/presentation/d/123',
      '_blank',
      'noopener,noreferrer',
    )
    expect(getPresentationHost('https://docs.google.com/presentation/d/123')).toBe('docs.google.com')
  })

  it('rejects missing, invalid and popup-blocked URLs', () => {
    expect(openPresentationUrl(null)).toEqual({
      success: false,
      error: 'Presentasjonen mangler en gyldig lenke.',
    })
    expect(openPresentationUrl('not-a-url')).toEqual({
      success: false,
      error: 'Presentasjonslenken er ugyldig. Bruk en HTTP- eller HTTPS-lenke.',
    })
    expect(openPresentationUrl('https://example.com', () => null)).toEqual({
      success: false,
      error: 'Nettleseren blokkerte åpningen av presentasjonen. Tillat popup-vinduer og prøv igjen.',
    })
  })
})
