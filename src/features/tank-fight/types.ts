// Tank Fight game types — pure TypeScript interfaces

export interface Vec2 {
  x: number
  y: number
}

export interface Tank {
  id: number
  pos: Vec2
  angle: number // radians, 0 = right, PI/2 = down
  vel: Vec2
  health: number
  maxHealth: number
  isPlayer: boolean
  color: string
  turretColor: string
  fireCooldown: number // ms remaining until can fire
}

export interface Bullet {
  id: number
  pos: Vec2
  vel: Vec2
  ownerId: number
  damage: number
  life: number // ms remaining
}

export type GamePhase = 'idle' | 'playing' | 'paused' | 'waveTransition' | 'gameOver'

export interface WaveConfig {
  enemyCount: number
  enemySpeed: number
  enemyFireRate: number
  enemyHealth: number
}

export interface GameState {
  player: Tank | null
  enemies: Tank[]
  bullets: Bullet[]
  wave: number
  maxWaves: number
  score: number
  lives: number
  phase: GamePhase
  elapsedMs: number
  waveTransitionTimer: number // ms until next wave spawns
  nextEntityId: number
}

export interface PlayerInput {
  moveDir: Vec2 // normalized direction vector
  aimAngle: number // radians
  fire: boolean
}

export function createZeroVec(): Vec2 {
  return { x: 0, y: 0 }
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function vecMul(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar }
}

export function vecLen(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function vecNormalize(v: Vec2): Vec2 {
  const len = vecLen(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function vecDistance(a: Vec2, b: Vec2): number {
  return vecLen(vecSub(a, b))
}

export function angleToVec(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

export function vecToAngle(v: Vec2): number {
  return Math.atan2(v.y, v.x)
}