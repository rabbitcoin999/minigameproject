/**
 * Sound types for the minigame platform sound effects system.
 */

export type SoundId =
  | 'click'
  | 'hover'
  | 'start'
  | 'pause'
  | 'score'
  | 'gameOver'
  | 'levelUp'
  | 'combo'
  | 'error'
  | 'shoot'

export interface SoundConfig {
  /** Base frequency in Hz */
  frequency: number
  /** Oscillator type */
  type: OscillatorType
  /** Duration in seconds */
  duration: number
  /** Peak gain (0-1) */
  gain: number
  /** Attack time in seconds */
  attack: number
  /** Release time in seconds */
  release: number
  /** Optional frequency sweep target (Hz). If present, frequency glides from `frequency` to this value. */
  sweepTo?: number
  /** Optional second oscillator for richer sounds */
  harmony?: {
    frequency: number
    type: OscillatorType
    gain: number
  }
}
