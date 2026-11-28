'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { SoundManager } from './sound-manager'
import { SoundContext, type SoundContextValue } from './sound-context'

export function SoundProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<SoundManager | null>(null)
  const [prefs, setPrefs] = useState({ muted: false, volume: 1 })

  // Create the manager in an effect (never during render — render must stay
  // pure so hydration output matches the server). Re-entrant under React
  // StrictMode's mount → cleanup → remount cycle: the cleanup nulls the ref
  // and the re-run rebuilds everything.
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new SoundManager()
      // Load persisted preferences AFTER hydration: the server rendered the
      // defaults, so adopting stored values now (post-commit) causes a
      // one-frame sync instead of a hydration mismatch.
      managerRef.current.refreshPrefs()
      setPrefs({
        muted: managerRef.current.isMuted(),
        volume: managerRef.current.getVolume(),
      })
    }

    // Unlock the AudioContext on the first user gesture (autoplay policy).
    // The first play() attempt also resumes, but an explicit listener makes the
    // first click sound reliable on iOS Safari.
    const manager = managerRef.current
    const unlock = () => {
      void manager.init()
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
      manager.dispose()
      managerRef.current = null
    }
  }, [])

  const play = useCallback((soundId: Parameters<SoundManager['play']>[0]) => {
    managerRef.current?.play(soundId)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    managerRef.current?.setMuted(muted)
    setPrefs((p) => ({ ...p, muted }))
  }, [])

  const setVolume = useCallback((volume: number) => {
    managerRef.current?.setVolume(volume)
    setPrefs((p) => ({ ...p, volume }))
  }, [])

  const value: SoundContextValue = {
    play,
    muted: prefs.muted,
    volume: prefs.volume,
    setMuted,
    setVolume,
  }

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
