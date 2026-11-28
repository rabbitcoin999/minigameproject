// Tank Fight game constants — pure constants, no logic

// Arena dimensions
export const ARENA_WIDTH = 800
export const ARENA_HEIGHT = 600
export const ARENA_MARGIN = 40 // safe margin from edges for spawning

// Player constants
export const PLAYER_SPEED = 200 // px/sec
export const PLAYER_HEALTH = 3
export const PLAYER_MAX_HEALTH = 3
export const PLAYER_FIRE_COOLDOWN = 300 // ms
export const PLAYER_COLOR = '#22c55e' // green-500
export const PLAYER_TURRET_COLOR = '#16a34a' // green-600

// Bullet constants
export const BULLET_SPEED = 600 // px/sec
export const BULLET_LIFETIME = 1500 // ms
export const BULLET_DAMAGE = 1
export const BULLET_RADIUS = 4
export const BULLET_COLOR = '#fbbf24' // amber-400
export const BULLET_PLAYER_COLOR = '#22d3ee' // cyan-400
export const BULLET_ENEMY_COLOR = '#ef4444' // red-500

// Enemy base constants
export const ENEMY_BASE_SPEED = 80 // px/sec
export const ENEMY_BASE_FIRE_RATE = 2000 // ms
export const ENEMY_BASE_HEALTH = 1
export const ENEMY_COLOR = '#ef4444' // red-500
export const ENEMY_TURRET_COLOR = '#dc2626' // red-600

// Wave progression
export const MAX_WAVES = 20
export const WAVE_SPAWN_DELAY = 2000 // ms between waves
export const BASE_ENEMIES_PER_WAVE = 3
export const ENEMIES_INCREMENT_PER_WAVE = 1
export const ENEMY_SPEED_INCREMENT_PER_WAVE = 5 // px/sec per wave
export const ENEMY_FIRE_RATE_DECREMENT_PER_WAVE = 50 // ms per wave (faster firing)
export const ENEMY_HEALTH_INCREMENT_PER_WAVE = 0 // every 3 waves +1 health

// Scoring
export const SCORE_PER_KILL = 100
export const SCORE_WAVE_BONUS = 500
export const SCORE_SURVIVAL_BONUS_PER_WAVE = 100

// Visual constants
export const TANK_BODY_RADIUS = 20
export const TANK_TURRET_LENGTH = 28
export const TANK_TURRET_WIDTH = 6
export const ENEMY_SPAWN_EFFECT_DURATION = 500 // ms
export const EXPLOSION_PARTICLE_COUNT = 12
export const EXPLOSION_PARTICLE_LIFE = 400 // ms
export const EXPLOSION_PARTICLE_SPEED = 100 // px/sec

// UI Colors
export const BACKGROUND_COLOR = '#0f172a' // dark-950
export const ARENA_BORDER_COLOR = '#334155' // dark-700
export const GRID_COLOR = '#1e293b' // dark-800
export const TEXT_COLOR = '#f8fafc' // white
export const UI_BG_COLOR = '#1e293b' // dark-800
export const UI_BORDER_COLOR = '#334155' // dark-700
export const HEART_COLOR = '#ef4444' // red-500
export const HEART_EMPTY_COLOR = '#334155' // dark-700

// Score validation (matching score-rules.ts pattern)
export const MAX_POSSIBLE_SCORE_PER_WAVE = 5000
export const MIN_DURATION_PER_POINT = 50 // ms per point

// Touch controls
export const JOYSTICK_RADIUS = 60
export const JOYSTICK_KNOB_RADIUS = 25
export const JOYSTICK_DEADZONE = 0.15