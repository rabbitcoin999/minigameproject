// Tank Fight game logic — pure functions, no React, no side effects
// All math is deterministic and Node-testable

import type {
  Vec2,
  Tank,
  Bullet,
  GameState,
  GamePhase,
  WaveConfig,
  PlayerInput,
} from './types.ts'
import {
  vecAdd,
  vecSub,
  vecMul,
  vecLen,
  vecNormalize,
  vecDistance,
  angleToVec,
  vecToAngle,
  createZeroVec,
} from './types.ts'
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  ARENA_MARGIN,
  PLAYER_SPEED,
  PLAYER_HEALTH,
  PLAYER_MAX_HEALTH,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_COLOR,
  PLAYER_TURRET_COLOR,
  BULLET_SPEED,
  BULLET_LIFETIME,
  BULLET_DAMAGE,
  BULLET_PLAYER_COLOR,
  BULLET_ENEMY_COLOR,
  ENEMY_BASE_SPEED,
  ENEMY_BASE_FIRE_RATE,
  ENEMY_BASE_HEALTH,
  ENEMY_COLOR,
  ENEMY_TURRET_COLOR,
  MAX_WAVES,
  WAVE_SPAWN_DELAY,
  BASE_ENEMIES_PER_WAVE,
  ENEMIES_INCREMENT_PER_WAVE,
  ENEMY_SPEED_INCREMENT_PER_WAVE,
  ENEMY_FIRE_RATE_DECREMENT_PER_WAVE,
  ENEMY_HEALTH_INCREMENT_PER_WAVE,
  SCORE_PER_KILL,
  SCORE_WAVE_BONUS,
  SCORE_SURVIVAL_BONUS_PER_WAVE,
  TANK_BODY_RADIUS,
} from './constants.ts'

// ============================================================================
// Wave Configuration
// ============================================================================

export function getWaveConfig(wave: number): WaveConfig {
  const waveIndex = Math.max(0, wave - 1)
  const enemyCount = BASE_ENEMIES_PER_WAVE + waveIndex * ENEMIES_INCREMENT_PER_WAVE
  const enemySpeed = ENEMY_BASE_SPEED + waveIndex * ENEMY_SPEED_INCREMENT_PER_WAVE
  const enemyFireRate = Math.max(
    500,
    ENEMY_BASE_FIRE_RATE - waveIndex * ENEMY_FIRE_RATE_DECREMENT_PER_WAVE
  )
  const enemyHealth = ENEMY_BASE_HEALTH + Math.floor(waveIndex / 3)

  return {
    enemyCount: Math.min(enemyCount, 15), // cap at 15 enemies
    enemySpeed: Math.min(enemySpeed, 200),
    enemyFireRate: Math.max(enemyFireRate, 500),
    enemyHealth: Math.min(enemyHealth, 4),
  }
}

// ============================================================================
// Entity Creation
// ============================================================================

function createTank(
  id: number,
  pos: Vec2,
  isPlayer: boolean,
  health: number,
  color: string,
  turretColor: string
): Tank {
  return {
    id,
    pos,
    angle: 0,
    vel: createZeroVec(),
    health,
    maxHealth: health,
    isPlayer,
    color,
    turretColor,
    fireCooldown: 0,
  }
}

function createBullet(
  id: number,
  pos: Vec2,
  angle: number,
  ownerId: number,
  isPlayerBullet: boolean
): Bullet {
  const dir = angleToVec(angle)
  const color = isPlayerBullet ? BULLET_PLAYER_COLOR : BULLET_ENEMY_COLOR
  return {
    id,
    pos,
    vel: vecMul(dir, BULLET_SPEED),
    ownerId,
    damage: BULLET_DAMAGE,
    life: BULLET_LIFETIME,
  }
}

// ============================================================================
// Initial State
// ============================================================================

export function createInitialState(): GameState {
  const center: Vec2 = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }

  return {
    player: createTank(1, center, true, PLAYER_MAX_HEALTH, PLAYER_COLOR, PLAYER_TURRET_COLOR),
    enemies: [],
    bullets: [],
    wave: 0,
    maxWaves: MAX_WAVES,
    score: 0,
    lives: PLAYER_HEALTH,
    phase: 'idle',
    elapsedMs: 0,
    waveTransitionTimer: 0,
    nextEntityId: 2,
  }
}

// ============================================================================
// Spawning
// ============================================================================

function getRandomSpawnPosition(existingTanks: Tank[]): Vec2 {
  const maxAttempts = 50
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pos: Vec2 = {
      x: ARENA_MARGIN + Math.random() * (ARENA_WIDTH - 2 * ARENA_MARGIN),
      y: ARENA_MARGIN + Math.random() * (ARENA_HEIGHT - 2 * ARENA_MARGIN),
    }

    // Check distance from existing tanks
    let tooClose = false
    for (const tank of existingTanks) {
      if (vecDistance(pos, tank.pos) < TANK_BODY_RADIUS * 3) {
        tooClose = true
        break
      }
    }

    if (!tooClose) return pos
  }

  // Fallback: corners
  const corners: Vec2[] = [
    { x: ARENA_MARGIN, y: ARENA_MARGIN },
    { x: ARENA_WIDTH - ARENA_MARGIN, y: ARENA_MARGIN },
    { x: ARENA_MARGIN, y: ARENA_HEIGHT - ARENA_MARGIN },
    { x: ARENA_WIDTH - ARENA_MARGIN, y: ARENA_HEIGHT - ARENA_MARGIN },
  ]
  return corners[Math.floor(Math.random() * corners.length)]
}

export function spawnWave(state: GameState, waveNum: number): GameState {
  const config = getWaveConfig(waveNum)
  const allTanks = state.player ? [state.player, ...state.enemies] : state.enemies
  const newEnemies: Tank[] = []

  for (let i = 0; i < config.enemyCount; i++) {
    const pos = getRandomSpawnPosition([...allTanks, ...newEnemies])
    const enemy = createTank(
      state.nextEntityId++,
      pos,
      false,
      config.enemyHealth,
      ENEMY_COLOR,
      ENEMY_TURRET_COLOR
    )
    // Store wave config on enemy for reference
    // (We'll use a simple approach: enemy speed/fire rate based on wave)
    newEnemies.push(enemy)
  }

  return {
    ...state,
    enemies: [...state.enemies, ...newEnemies],
    wave: waveNum,
    phase: 'playing',
    waveTransitionTimer: 0,
  }
}

// ============================================================================
// Player Update
// ============================================================================

function clampToArena(pos: Vec2): Vec2 {
  const margin = TANK_BODY_RADIUS
  return {
    x: Math.max(margin, Math.min(ARENA_WIDTH - margin, pos.x)),
    y: Math.max(margin, Math.min(ARENA_HEIGHT - margin, pos.y)),
  }
}

export function updatePlayer(state: GameState, input: PlayerInput, dt: number): GameState {
  if (!state.player) return state

  const player = state.player
  let newPlayer = { ...player }

  // Movement
  if (vecLen(input.moveDir) > 0) {
    const moveVel = vecMul(input.moveDir, PLAYER_SPEED)
    const newPos = vecAdd(player.pos, vecMul(moveVel, dt / 1000))
    newPlayer = { ...newPlayer, pos: clampToArena(newPos), vel: moveVel }
  } else {
    newPlayer = { ...newPlayer, vel: createZeroVec() }
  }

  // Aiming (instant for mouse, could add smoothing for gamepad)
  newPlayer = { ...newPlayer, angle: input.aimAngle }

  // Fire cooldown
  let fireCooldown = Math.max(0, player.fireCooldown - dt)
  const canFire = fireCooldown <= 0 && input.fire

  let newBullets = state.bullets
  let nextEntityId = state.nextEntityId

  if (canFire) {
    const bulletPos = vecAdd(
      player.pos,
      vecMul(angleToVec(player.angle), TANK_BODY_RADIUS + 5)
    )
    const bullet = createBullet(nextEntityId++, bulletPos, player.angle, player.id, true)
    newBullets = [...state.bullets, bullet]
    fireCooldown = PLAYER_FIRE_COOLDOWN
  }

  newPlayer = { ...newPlayer, fireCooldown }

  return {
    ...state,
    player: newPlayer,
    bullets: newBullets,
    nextEntityId,
  }
}

// ============================================================================
// Enemy AI
// ============================================================================

function updateEnemyAI(enemy: Tank, player: Tank, config: WaveConfig, dt: number): Tank {
  if (!player) return enemy

  let newEnemy = { ...enemy }

  // Direction to player
  const toPlayer = vecSub(player.pos, enemy.pos)
  const distance = vecLen(toPlayer)
  const dirToPlayer = vecNormalize(toPlayer)

  // Move toward player
  const moveVel = vecMul(dirToPlayer, config.enemySpeed)
  const newPos = vecAdd(enemy.pos, vecMul(moveVel, dt / 1000))
  newEnemy = { ...newEnemy, pos: clampToArena(newPos), vel: moveVel }

  // Aim at player
  newEnemy = { ...newEnemy, angle: vecToAngle(toPlayer) }

  // Fire cooldown
  let fireCooldown = Math.max(0, enemy.fireCooldown - dt)
  const canFire = fireCooldown <= 0 && distance < 500 // only shoot if in range

  // (Bullets will be created in the main updateEnemies function)
  newEnemy = { ...newEnemy, fireCooldown }

  return newEnemy
}

export function updateEnemies(state: GameState, dt: number): GameState {
  if (state.phase !== 'playing' || !state.player) return state

  const config = getWaveConfig(state.wave)
  const newEnemies: Tank[] = []
  const newBullets: Bullet[] = [...state.bullets]
  let nextEntityId = state.nextEntityId

  for (const enemy of state.enemies) {
    // Update AI
    let updatedEnemy = updateEnemyAI(enemy, state.player, config, dt)

    // Fire if ready
    if (enemy.fireCooldown <= dt && vecDistance(enemy.pos, state.player.pos) < 500) {
      const bulletPos = vecAdd(
        enemy.pos,
        vecMul(angleToVec(enemy.angle), TANK_BODY_RADIUS + 5)
      )
      const bullet = createBullet(nextEntityId++, bulletPos, enemy.angle, enemy.id, false)
      newBullets.push(bullet)
      updatedEnemy = { ...updatedEnemy, fireCooldown: config.enemyFireRate }
    }

    newEnemies.push(updatedEnemy)
  }

  return {
    ...state,
    enemies: newEnemies,
    bullets: newBullets,
    nextEntityId,
  }
}

// ============================================================================
// Bullet Update
// ============================================================================

export function updateBullets(state: GameState, dt: number): GameState {
  const newBullets = state.bullets
    .map((bullet) => {
      const newPos = vecAdd(bullet.pos, vecMul(bullet.vel, dt / 1000))
      const newLife = bullet.life - dt
      return { ...bullet, pos: newPos, life: newLife }
    })
    .filter((bullet) => bullet.life > 0)

  // Remove bullets that leave arena
  const inBounds = newBullets.filter(
    (b) =>
      b.pos.x >= -50 &&
      b.pos.x <= ARENA_WIDTH + 50 &&
      b.pos.y >= -50 &&
      b.pos.y <= ARENA_HEIGHT + 50
  )

  return { ...state, bullets: inBounds }
}

// ============================================================================
// Collision Detection
// ============================================================================

function checkBulletTankCollision(bullet: Bullet, tank: Tank): boolean {
  const distance = vecDistance(bullet.pos, tank.pos)
  return distance < TANK_BODY_RADIUS + BULLET_DAMAGE // bullet radius approx
}

function checkTankTankCollision(tankA: Tank, tankB: Tank): boolean {
  const distance = vecDistance(tankA.pos, tankB.pos)
  return distance < TANK_BODY_RADIUS * 2
}

export function checkCollisions(state: GameState): GameState {
  if (state.phase !== 'playing') return state

  let newState = { ...state }
  let score = state.score
  let player = state.player
  const enemies = [...state.enemies]
  const bullets = [...state.bullets]
  let playerHit = false

  // Track which enemies are hit (by index in the enemies array)
  const enemyHitIndices = new Set<number>()

  // Bullet vs Tank collisions
  const survivingBullets: Bullet[] = []

  for (const bullet of bullets) {
    let bulletHit = false

    // Check player (only enemy bullets hit player)
    if (player && bullet.ownerId !== player.id && checkBulletTankCollision(bullet, player)) {
      playerHit = true
      bulletHit = true
      // Player takes damage
      player = { ...player, health: player.health - bullet.damage }
    }

    // Check enemies (only player bullets hit enemies)
    if (!bulletHit && player && bullet.ownerId === player.id) {
      for (let i = 0; i < enemies.length; i++) {
        if (enemyHitIndices.has(i)) continue // Already hit by another bullet
        if (checkBulletTankCollision(bullet, enemies[i])) {
          bulletHit = true
          enemyHitIndices.add(i)
          const enemy = enemies[i]
          const newHealth = enemy.health - bullet.damage
          if (newHealth <= 0) {
            // Enemy destroyed
            score += SCORE_PER_KILL
          }
          break // One bullet hits max one enemy
        }
      }
    }

    if (!bulletHit) {
      survivingBullets.push(bullet)
    }
  }

  // Build surviving enemies array (remove hit ones)
  const survivingEnemies = enemies.filter((_, i) => !enemyHitIndices.has(i))

  // Tank vs Tank collisions (push apart)
  let finalEnemies = survivingEnemies
  if (player) {
    for (const enemy of finalEnemies) {
      if (checkTankTankCollision(player, enemy)) {
        // Push player away from enemy
        const pushDir = vecNormalize(vecSub(player.pos, enemy.pos))
        player = {
          ...player,
          pos: clampToArena(vecAdd(player.pos, vecMul(pushDir, 5))),
        }
      }
    }
  }

  newState = {
    ...newState,
    player,
    enemies: finalEnemies,
    bullets: survivingBullets,
    score,
  }

  // Handle player death
  if (playerHit && player && player.health <= 0) {
    newState = handlePlayerDeath(newState)
  }

  return newState
}

function handlePlayerDeath(state: GameState): GameState {
  const newLives = state.lives - 1

  if (newLives <= 0) {
    return {
      ...state,
      lives: 0,
      phase: 'gameOver',
      player: null,
    }
  }

  // Respawn player in center after brief invincibility
  const center: Vec2 = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }
  const newPlayer = createTank(
    state.nextEntityId++,
    center,
    true,
    PLAYER_MAX_HEALTH,
    PLAYER_COLOR,
    PLAYER_TURRET_COLOR
  )

  return {
    ...state,
    lives: newLives,
    player: newPlayer,
    // Clear bullets near player
    bullets: state.bullets.filter((b) => vecDistance(b.pos, center) > 200),
  }
}

// ============================================================================
// Wave Management
// ============================================================================

export function checkWaveComplete(state: GameState): GameState {
  if (state.phase !== 'playing') return state

  if (state.enemies.length === 0 && state.wave > 0) {
    // Wave cleared!
    const waveBonus = SCORE_WAVE_BONUS + state.wave * SCORE_SURVIVAL_BONUS_PER_WAVE
    const newScore = state.score + waveBonus

    if (state.wave >= state.maxWaves) {
      // Game won!
      return {
        ...state,
        score: newScore,
        phase: 'gameOver', // treat as game over with victory
      }
    }

    return {
      ...state,
      score: newScore,
      phase: 'waveTransition',
      waveTransitionTimer: WAVE_SPAWN_DELAY,
    }
  }

  return state
}

export function updateWaveTransition(state: GameState, dt: number): GameState {
  if (state.phase !== 'waveTransition') return state

  const newTimer = Math.max(0, state.waveTransitionTimer - dt)

  if (newTimer <= 0) {
    // Spawn next wave
    return spawnWave(state, state.wave + 1)
  }

  return { ...state, waveTransitionTimer: newTimer }
}

// ============================================================================
// Main Tick Function
// ============================================================================

export function tick(state: GameState, input: PlayerInput, dt: number): GameState {
  if (state.phase === 'idle' || state.phase === 'gameOver' || state.phase === 'paused') {
    return { ...state, elapsedMs: state.elapsedMs + dt }
  }

  let newState = { ...state, elapsedMs: state.elapsedMs + dt }

  // Update wave transition
  newState = updateWaveTransition(newState, dt)

  // Update player
  if (newState.player) {
    newState = updatePlayer(newState, input, dt)
  }

  // Update enemies
  newState = updateEnemies(newState, dt)

  // Update bullets
  newState = updateBullets(newState, dt)

  // Check collisions
  newState = checkCollisions(newState)

  // Check wave complete
  newState = checkWaveComplete(newState)

  return newState
}

// ============================================================================
// Input Helpers
// ============================================================================

export function createInput(
  moveDir: Vec2,
  aimAngle: number,
  fire: boolean
): PlayerInput {
  return { moveDir, aimAngle, fire }
}

export function createZeroInput(): PlayerInput {
  return {
    moveDir: createZeroVec(),
    aimAngle: 0,
    fire: false,
  }
}

// ============================================================================
// Formatting
// ============================================================================

export function formatScore(score: number): string {
  return `${score.toLocaleString()} pts`
}

export function formatWave(wave: number, maxWaves: number): string {
  return `Wave ${wave} / ${maxWaves}`
}

export function formatLives(lives: number): string {
  return '♥'.repeat(lives) + '♡'.repeat(Math.max(0, PLAYER_HEALTH - lives))
}