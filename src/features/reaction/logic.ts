// Reaction game logic — pure functions, no React

export const TOTAL_ROUNDS = 5
export const MIN_DELAY_MS = 1_200
export const MAX_DELAY_MS = 4_500
// Human reaction floor: anything below this is a false start / impossible
export const IMPOSSIBLE_THRESHOLD_MS = 80

export type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'false-start' | 'finished'

export function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
}

export function averageReaction(times: number[]): number {
  if (times.length === 0) return 0
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

export function formatMs(ms: number): string {
  return `${ms} ms`
}

export function ratingFor(ms: number): { label: string; emoji: string } {
  if (ms < 200) return { label: 'Lightning fast!', emoji: '⚡' }
  if (ms < 280) return { label: 'Great reflexes!', emoji: '🔥' }
  if (ms < 380) return { label: 'Pretty good!', emoji: '👍' }
  if (ms < 500) return { label: 'Not bad.', emoji: '🙂' }
  return { label: 'Keep practicing!', emoji: '🐢' }
}
