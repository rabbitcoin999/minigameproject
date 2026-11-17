// Whack-a-Mole game logic — pure functions, no React

export const GAME_DURATION_MS = 30_000
export const GRID_COLS = 3
export const GRID_ROWS = 3
export const NORMAL_POINTS = 1
export const BONUS_POINTS = 3
export const BONUS_CHANCE = 0.15 // 15% of moles are golden bonus moles

export interface MoleConfig {
  // How long a mole stays up, in ms — shrinks as game progresses
  upDurationMs: number
  // Gap between moles, in ms
  spawnGapMs: number
}

/** Difficulty ramps up as time passes. */
export function difficultyAt(elapsedMs: number): MoleConfig {
  const progress = Math.min(1, elapsedMs / GAME_DURATION_MS)
  return {
    upDurationMs: Math.round(900 - progress * 500), // 900ms → 400ms
    spawnGapMs: Math.round(700 - progress * 350), // 700ms → 350ms
  }
}

export interface ActiveMole {
  id: number
  cell: number
  isBonus: boolean
  despawnsAt: number
}

/** Choose a random empty cell. Returns null if the grid is full. */
export function pickCell(active: ActiveMole[]): number | null {
  const occupied = new Set(active.map((m) => m.cell))
  const free: number[] = []
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    if (!occupied.has(i)) free.push(i)
  }
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

export function spawnMole(now: number, upDurationMs: number, active: ActiveMole[]): ActiveMole | null {
  const cell = pickCell(active)
  if (cell === null) return null
  return {
    id: now + Math.floor(Math.random() * 1000),
    cell,
    isBonus: Math.random() < BONUS_CHANCE,
    despawnsAt: now + upDurationMs,
  }
}

export function pruneMoles(active: ActiveMole[], now: number): ActiveMole[] {
  return active.filter((m) => m.despawnsAt > now)
}
