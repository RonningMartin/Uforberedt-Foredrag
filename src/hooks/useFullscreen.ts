import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

interface UseFullscreenResult<T extends HTMLElement> {
  containerRef: RefObject<T | null>
  isFullscreen: boolean
  error: string | null
  clearError: () => void
  enterFullscreen: () => Promise<boolean>
  exitFullscreen: () => Promise<boolean>
  toggleFullscreen: () => Promise<boolean>
}

export function useFullscreen<T extends HTMLElement>(): UseFullscreenResult<T> {
  const containerRef = useRef<T | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    function handleFullscreenError() {
      setError('Nettleseren tillot ikke fullskjerm. Prøv igjen eller bruk vanlig visning.')
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('fullscreenerror', handleFullscreenError)

    handleFullscreenChange()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('fullscreenerror', handleFullscreenError)
    }
  }, [])

  async function enterFullscreen() {
    const container = containerRef.current

    if (container === null || typeof container.requestFullscreen !== 'function') {
      setError('Fullskjerm er ikke tilgjengelig i denne nettleseren.')
      return false
    }

    try {
      await container.requestFullscreen()
      setError(null)
      return true
    } catch {
      setError('Nettleseren tillot ikke fullskjerm. Prøv igjen eller bruk vanlig visning.')
      return false
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement === null || typeof document.exitFullscreen !== 'function') {
      return true
    }

    try {
      await document.exitFullscreen()
      setError(null)
      return true
    } catch {
      setError('Kunne ikke avslutte fullskjerm i nettleseren.')
      return false
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === containerRef.current) {
      return exitFullscreen()
    }

    return enterFullscreen()
  }

  return {
    containerRef,
    isFullscreen,
    error,
    clearError: () => setError(null),
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
