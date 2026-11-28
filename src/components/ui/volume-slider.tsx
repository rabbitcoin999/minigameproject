'use client'

import { useSound } from '@/lib/sound/sound-context'

export function VolumeSlider() {
  const { volume, setVolume, muted } = useSound()

  return (
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={muted ? 0 : volume}
      onChange={(e) => setVolume(parseFloat(e.target.value))}
      aria-label="Sound volume"
      title="Sound volume"
      className="hidden h-1.5 w-20 cursor-pointer accent-primary-500 sm:block"
    />
  )
}
