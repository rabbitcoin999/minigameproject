/**
 * SoundManager — programmatic sound synthesis via Web Audio API.
 *
 * All sounds are generated on-demand with OscillatorNodes: no audio files,
 * no fetches, no decode latency. AudioContext is created lazily on the first
 * user gesture (autoplay policy) and shared for the lifetime of the page.
 */

import type { SoundConfig, SoundId } from './sound-types'

const STORAGE_KEY_MUTED = 'sound-muted'
const STORAGE_KEY_VOLUME = 'sound-volume'

const DEFAULT_CONFIGS: Record<SoundId, SoundConfig> = {
  click: { frequency: 660, type: 'triangle', duration: 0.08, gain: 0.35, attack: 0.002, release: 0.05 },
  hover: { frequency: 440, type: 'sine', duration: 0.05, gain: 0.08, attack: 0.005, release: 0.03 },
  start: {
    frequency: 392, type: 'triangle', duration: 0.32, gain: 0.3, attack: 0.005, release: 0.18,
    sweepTo: 784, harmony: { frequency: 523.25, type: 'sine', gain: 0.15 },
  },
  pause: { frequency: 440, type: 'sine', duration: 0.18, gain: 0.25, attack: 0.005, release: 0.12, sweepTo: 294 },
  score: { frequency: 880, type: 'triangle', duration: 0.12, gain: 0.3, attack: 0.002, release: 0.08, sweepTo: 1318 },
  gameOver: {
    frequency: 440, type: 'sawtooth', duration: 0.6, gain: 0.25, attack: 0.005, release: 0.4, sweepTo: 110,
    harmony: { frequency: 220, type: 'triangle', gain: 0.12 },
  },
  levelUp: {
    frequency: 523.25, type: 'triangle', duration: 0.45, gain: 0.3, attack: 0.005, release: 0.25, sweepTo: 1046.5,
    harmony: { frequency: 659.25, type: 'sine', gain: 0.18 },
  },
  combo: { frequency: 988, type: 'square', duration: 0.15, gain: 0.2, attack: 0.002, release: 0.1, sweepTo: 1568 },
  error: { frequency: 220, type: 'square', duration: 0.25, gain: 0.22, attack: 0.003, release: 0.15, sweepTo: 165 },
}

export class SoundManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false
  private volume = 1.0
  private disabled = false
  private reducedMotionQuery: MediaQueryList | null = null
  private configs: Record<SoundId, SoundConfig> = { ...DEFAULT_CONFIGS }
  private recentPlayTimes = new Map<SoundId, number>()

  constructor() {
    this.loadPreferences()
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.disabled = this.reducedMotionQuery.matches
      this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange)
    }
  }

  private handleReducedMotionChange = (e: MediaQueryListEvent) => {
    this.disabled = e.matches
  }

  private loadPreferences(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const m = window.localStorage.getItem(STORAGE_KEY_MUTED)
      if (m !== null) this.muted = m === 'true'
      const v = window.localStorage.getItem(STORAGE_KEY_VOLUME)
      if (v !== null) {
        const parsed = parseFloat(v)
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) this.volume = parsed
      }
    } catch {
      // localStorage unavailable (private mode, blocked) — defaults are fine
    }
  }

  private persist(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Non-fatal — preference just won't survive reload
    }
  }

  /**
   * Create/resume the AudioContext. Safe to call repeatedly; called lazily
   * from play() and explicitly from init() on first user interaction.
   */
  async init(): Promise<void> {
    this.ensureContext()
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch {
        // Resume can reject before a user gesture — play() will retry later.
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioContext) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.audioContext = new Ctor()
        this.masterGain = this.audioContext.createGain()
        this.masterGain.gain.value = this.muted ? 0 : this.volume
        this.masterGain.connect(this.audioContext.destination)
      } catch {
        return null
      }
    }
    return this.audioContext
  }

  play(soundId: SoundId): void {
    if (this.disabled || this.muted) return

    // Rate-limit identical sounds: max one per 40ms (button spam protection)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const last = this.recentPlayTimes.get(soundId)
    if (last !== undefined && now - last < 40) return
    this.recentPlayTimes.set(soundId, now)

    const ctx = this.ensureContext()
    if (!ctx || !this.masterGain) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const config = this.configs[soundId]
    if (!config) return

    try {
      const t0 = ctx.currentTime
      const duration = config.duration
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = config.type
      osc.frequency.setValueAtTime(config.frequency, t0)
      if (config.sweepTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, config.sweepTo), t0 + duration)
      }

      // Attack/release envelope
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(config.gain, t0 + config.attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration - config.release >= config.attack
        ? t0 + duration
        : t0 + config.attack + config.release)

      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(t0)
      osc.stop(t0 + duration + 0.05)

      if (config.harmony) {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = config.harmony.type
        osc2.frequency.setValueAtTime(config.harmony.frequency, t0)
        if (config.sweepTo !== undefined) {
          osc2.frequency.exponentialRampToValueAtTime(Math.max(1, config.sweepTo), t0 + duration)
        }
        gain2.gain.setValueAtTime(0.0001, t0)
        gain2.gain.exponentialRampToValueAtTime(config.harmony.gain, t0 + config.attack)
        gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
        osc2.connect(gain2)
        gain2.connect(this.masterGain)
        osc2.start(t0)
        osc2.stop(t0 + duration + 0.05)
      }
    } catch {
      // Audio graph errors are non-fatal — silence is better than a crash
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.persist(STORAGE_KEY_MUTED, String(muted))
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    this.persist(STORAGE_KEY_VOLUME, String(this.volume))
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  getVolume(): number {
    return this.volume
  }

  dispose(): void {
    if (this.reducedMotionQuery) {
      this.reducedMotionQuery.removeEventListener('change', this.handleReducedMotionChange)
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
      this.masterGain = null
    }
  }
}
