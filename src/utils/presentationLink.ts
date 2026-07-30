import { isValidPresentationUrl } from './setupValidation'

export interface PresentationOpenResult {
  success: boolean
  error?: string
}

export type OpenWindowFn = (
  url: string,
  target?: string,
  features?: string,
) => Window | null

export function openPresentationUrl(
  url: string | null,
  openWindow: OpenWindowFn = defaultOpenWindow,
): PresentationOpenResult {
  if (url === null || url.trim().length === 0) {
    return {
      success: false,
      error: 'Presentasjonen mangler en gyldig lenke.',
    }
  }

  if (!isValidPresentationUrl(url)) {
    return {
      success: false,
      error: 'Presentasjonslenken er ugyldig. Bruk en HTTP- eller HTTPS-lenke.',
    }
  }

  const openedWindow = openWindow(url, '_blank', 'noopener,noreferrer')

  if (openedWindow === null) {
    return {
      success: false,
      error: 'Nettleseren blokkerte åpningen av presentasjonen. Tillat popup-vinduer og prøv igjen.',
    }
  }

  try {
    openedWindow.opener = null
  } catch {
    return {
      success: true,
    }
  }

  return {
    success: true,
  }
}

export function getPresentationHost(url: string | null): string | null {
  if (url === null || !isValidPresentationUrl(url)) {
    return null
  }

  return new URL(url).host.replace(/^www\./u, '')
}

function defaultOpenWindow(url: string, target?: string, features?: string): Window | null {
  if (typeof window === 'undefined' || typeof window.open !== 'function') {
    return null
  }

  return window.open(url, target, features)
}
