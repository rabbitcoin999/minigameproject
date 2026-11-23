// Brick Blast game types — pure TypeScript, no React

export type GamePhase = 'idle' | 'playing' | 'paused' | 'levelComplete' | 'gameOver'

export type BrickType = 'normal' | 'hard' | 'unbreakable' | 'explosive' | 'multiplier'

export interface Vector2 {
  x: number
  y: number
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface Ball {
  position: Vector2
  velocity: Vector2
  radius: number
  speed: number
  launched: boolean
}

export interface Paddle {
  position: Vector2
  width: number
  height: number
  speed: number
}

export interface Brick {
  id: number
  position: Vector2
  width: number
  height: number
  type: BrickType
  hitsRemaining: number
  maxHits: number
  points: number
  color: string
}

export interface Particle {
  position: Vector2
  velocity: Vector2
  color: string
  life: number
  maxLife: number
  size: number
}

export interface BrickBlastState {
  phase: GamePhase
  score: number
  lives: number
  level: number
  ball: Ball
  paddle: Paddle
  bricks: Brick[]
  particles: Particle[]
  canvasWidth: number
  canvasHeight: number
  gameWidth: number
  gameHeight: number
  paddleTargetX: number
  combo: number
  lastHitTime: number
}

export interface LevelConfig {
  rows: number
  cols: number
  brickTypes: BrickType[]
  ballSpeedMultiplier: number
  paddleWidthMultiplier: number
}

// Brick type configurations
export const BRICK_CONFIGS: Record<BrickType, {
  hits: number;
  points: number;
  color: string;
  gradient: string;
  probability: number;
}> = {
  normal: { hits: 1, points: 10, color: '#22c55e', gradient: 'from-green-500 to-green-600', probability: 0.55 },
  hard: { hits: 2, points: 25, color: '#f59e0b', gradient: 'from-amber-500 to-amber-600', probability: 0.20 },
  unbreakable: { hits: -1, points: 0, color: '#64748b', gradient: 'from-slate-500 to-slate-600', probability: 0.10 },
  explosive: { hits: 1, points: 50, color: '#ef4444', gradient: 'from-red-500 to-red-600', probability: 0.10 },
  multiplier: { hits: 1, points: 5, color: '#8b5cf6', gradient: 'from-violet-500 to-violet-600', probability: 0.05 },
}