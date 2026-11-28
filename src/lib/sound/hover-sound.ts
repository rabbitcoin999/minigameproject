'use client'

import { useCallback, useRef } from 'react'
import { useSound } from './sound-context'

/** Minimum ms between hover sounds across all elements sharing this hook. */
const HOVER_COOLDOWN_MS = 100

/**
 * Returns an onMouseEnter handler that plays the 'hover' sound, but only on
 * devices with a real pointer (hover-capable — never touch) and never more
 * often than once per cooldown window.
 */
export function useHoverSound() {
  const { play } = useSound()
  const lastPlayedRef = useRef(0)
  const hoverCapableRef = useRef<boolean | null>(null)

  const isHoverCapable = useCallback(() => {
    if (hoverCapableRef.current === null) {
      hoverCapableRef.current =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(hover: hover)').matches
    }
    return hoverCapableRef.current
  }, [])

  return useCallback(() => {
    if (!isHoverCapable()) return
    const now = performance.now()
    if (now - lastPlayedRef.current < HOVER_COOLDOWN_MS) return
    lastPlayedRef.current = now
    play('hover')
  }, [play, isHoverCapable])
}
