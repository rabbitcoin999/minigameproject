'use client'

import { createContext, useContext } from 'react'
import type { SoundId } from './sound-types'

export interface SoundContextValue {
  /** Play a sound by id (no-op when muted or reduced-motion is on) */
  play: (soundId: SoundId) => void
  muted: boolean
  volume: number
  setMuted: (muted: boolean) => void
  setVolume: (volume: number) => void
}

export const SoundContext = createContext<SoundContextValue>({
  play: () => {},
  muted: false,
  volume: 1,
  setMuted: () => {},
  setVolume: () => {},
})

export function useSound(): SoundContextValue {
  return useContext(SoundContext)
}
