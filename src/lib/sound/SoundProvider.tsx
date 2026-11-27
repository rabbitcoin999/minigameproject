'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { SoundManager } from './sound-manager'
import { SoundContext, type SoundContextValue } from './sound-context'

export function SoundProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<SoundManager | null>(null)
  const [prefs, setPrefs] = useState({ muted: false, volume: 1 })

  // Create the manager once, client-side only.
  if (managerRef.current === null && typeof window !== 'undefined') {
    managerRef.current = new SoundManager()
    setPrefs({ muted: managerRef.current.isMuted(), volume: managerRef.current.getVolume() })
  }

  // Unlock the AudioContext on the first user gesture (autoplay policy).
  // The first play() attempt also resumes, but an explicit listener makes the
  // first click sound reliable on iOS Safari.
  useEffect(() => {
    const manager = managerRef.current
    if (!manager) return

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
