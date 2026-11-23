// Brick Blast game constants — pure constants, no logic

import type { LevelConfig } from './types'

// Game dimensions
export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

// Physics constants
export const INITIAL_BALL_SPEED = 350 // pixels per second
export const BALL_SPEED_INCREMENT_PER_LEVEL = 25
export const MAX_BALL_SPEED = 800
export const BALL_RADIUS = 8
export const BALL_LAUNCH_ANGLE_VARIANCE = 0.3 // radians

export const INITIAL_PADDLE_WIDTH = 120
export const MIN_PADDLE_WIDTH = 60
export const PADDLE_HEIGHT = 16
export const PADDLE_Y_OFFSET = 40 // pixels from bottom
export const PADDLE_SPEED = 600 // pixels per second
export const PADDLE_EDGE_BOUNCE_FACTOR = 0.3 // how much paddle movement affects ball angle

// Brick constants
export const BRICK_WIDTH = 70
export const BRICK_HEIGHT = 28
export const BRICK_PADDING = 4
export const BRICK_TOP_OFFSET = 60
export const BRICK_SIDE_PADDING = 40

// Game rules
export const INITIAL_LIVES = 3
export const MAX_LIVES = 5
export const EXTRA_LIFE_SCORE = 5000 // score threshold for extra life
export const COMBO_TIMEOUT_MS = 1000 // combo resets after this many ms
export const MAX_COMBO_MULTIPLIER = 5

// Visual constants
export const PARTICLE_COUNT_ON_HIT = 8
export const PARTICLE_COUNT_ON_DESTROY = 16
export const PARTICLE_LIFE_MS = 600
export const PARTICLE_SPEED = 150

// Level configurations
export const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1 - Easy introduction
  {
    rows: 4,
    cols: 10,
    brickTypes: ['normal', 'normal', 'normal', 'normal', 'normal', 'hard'],
    ballSpeedMultiplier: 1.0,
    paddleWidthMultiplier: 1.0,
  },
  // Level 2 - More bricks, some hard
  {
    rows: 5,
    cols: 10,
    brickTypes: ['normal', 'normal', 'normal', 'hard', 'hard', 'explosive'],
    ballSpeedMultiplier: 1.1,
    paddleWidthMultiplier: 1.0,
  },
  // Level 3 - Unbreakable bricks introduced
  {
    rows: 5,
    cols: 10,
    brickTypes: ['normal', 'normal', 'hard', 'hard', 'unbreakable', 'explosive'],
    ballSpeedMultiplier: 1.2,
    paddleWidthMultiplier: 0.95,
  },
  // Level 4 - Dense with unbreakable
  {
    rows: 6,
    cols: 10,
    brickTypes: ['normal', 'hard', 'hard', 'unbreakable', 'unbreakable', 'explosive', 'multiplier'],
    ballSpeedMultiplier: 1.3,
    paddleWidthMultiplier: 0.9,
  },
  // Level 5 - Challenge level
  {
    rows: 6,
    cols: 10,
    brickTypes: ['hard', 'hard', 'unbreakable', 'unbreakable', 'explosive', 'explosive', 'multiplier'],
    ballSpeedMultiplier: 1.4,
    paddleWidthMultiplier: 0.85,
  },
  // Level 6+ - Repeat with increasing speed
  {
    rows: 7,
    cols: 10,
    brickTypes: ['hard', 'hard', 'unbreakable', 'explosive', 'explosive', 'multiplier', 'multiplier'],
    ballSpeedMultiplier: 1.5,
    paddleWidthMultiplier: 0.8,
  },
]

// Score validation constants (matching score-rules.ts pattern)
export const MAX_POSSIBLE_SCORE_PER_LEVEL = 15000
export const MIN_DURATION_PER_POINT = 50 // ms per point at high speed

// Colors
export const BACKGROUND_COLOR = '#0f172a' // dark-950
export const WALL_COLOR = '#334155' // dark-700
export const PADDLE_COLOR = '#06b6d4' // cyan-500
export const PADDLE_GLOW_COLOR = '#22d3ee' // cyan-400
export const BALL_COLOR = '#fbbf24' // amber-400
export const BALL_GLOW_COLOR = '#fde047' // yellow-300
export const TEXT_COLOR = '#f8fafc' // white
export const UI_BG_COLOR = '#1e293b' // dark-800
export const UI_BORDER_COLOR = '#334155' // dark-700