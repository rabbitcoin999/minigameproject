// Tank Fight game logic tests — pure function tests

import {
  createInitialState,
  spawnWave,
  tick,
  updatePlayer,
  updateEnemies,
  updateBullets,
  checkCollisions,
  checkWaveComplete,
  updateWaveTransition,
  getWaveConfig,
  createInput,
  createZeroInput,
  formatScore,
  formatWave,
  formatLives,
  vecAdd,
  vecSub,
  vecMul,
  vecLen,
  vecNormalize,
  vecDistance,
  angleToVec,
  vecToAngle,
  createZeroVec,
} from './logic'
import type { GameState, PlayerInput } from './types'

describe('Vector Math', () => {
  test('createZeroVec returns zero vector', () => {
    expect(createZeroVec()).toEqual({ x: 0, y: 0 })
  })

  test('vecAdd adds vectors correctly', () => {
    expect(vecAdd({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
  })

  test('vecSub subtracts vectors correctly', () => {
    expect(vecSub({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 })
  })

  test('vecMul multiplies vector by scalar', () => {
    expect(vecMul({ x: 2, y: 3 }, 5)).toEqual({ x: 10, y: 15 })
  })

  test('vecLen calculates magnitude correctly', () => {
    expect(vecLen({ x: 3, y: 4 })).toBe(5)
    expect(vecLen({ x: 0, y: 0 })).toBe(0)
  })

  test('vecNormalize normalizes vector', () => {
    const v = vecNormalize({ x: 3, y: 4 })
    expect(vecLen(v)).toBeCloseTo(1)
    expect(v.x).toBeCloseTo(0.6)
    expect(v.y).toBeCloseTo(0.8)
  })

  test('vecNormalize handles zero vector', () => {
    expect(vecNormalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  test('vecDistance calculates distance correctly', () => {
    expect(vecDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  test('angleToVec and vecToAngle are inverses', () => {
    const angle = Math.PI / 4 // 45 degrees
    const vec = angleToVec(angle)
    const back = vecToAngle(vec)
    expect(back).toBeCloseTo(angle)
  })
})

describe('Wave Configuration', () => {
  test('getWaveConfig returns base config for wave 1', () => {
    const config = getWaveConfig(1)
    expect(config.enemyCount).toBe(3)
    expect(config.enemySpeed).toBe(80)
    expect(config.enemyFireRate).toBe(2000)
    expect(config.enemyHealth).toBe(1)
  })

  test('getWaveConfig scales with wave number', () => {
    const config = getWaveConfig(5)
    expect(config.enemyCount).toBeGreaterThan(3)
    expect(config.enemySpeed).toBeGreaterThan(80)
    expect(config.enemyFireRate).toBeLessThan(2000)
    expect(config.enemyHealth).toBeGreaterThanOrEqual(1)
  })

  test('getWaveConfig caps enemy count at 15', () => {
    const config = getWaveConfig(20)
    expect(config.enemyCount).toBeLessThanOrEqual(15)
  })

  test('getWaveConfig caps enemy speed at 200', () => {
    const config = getWaveConfig(20)
    expect(config.enemySpeed).toBeLessThanOrEqual(200)
  })

  test('getWaveConfig minimum fire rate is 500', () => {
    const config = getWaveConfig(20)
    expect(config.enemyFireRate).toBeGreaterThanOrEqual(500)
  })
})

describe('Initial State', () => {
  test('createInitialState creates valid state', () => {
    const state = createInitialState()

    expect(state.player).not.toBeNull()
    expect(state.player?.isPlayer).toBe(true)
    expect(state.player?.health).toBe(3)
    expect(state.player?.maxHealth).toBe(3)
    expect(state.enemies).toHaveLength(0)
    expect(state.bullets).toHaveLength(0)
    expect(state.wave).toBe(0)
    expect(state.score).toBe(0)
    expect(state.lives).toBe(3)
    expect(state.phase).toBe('idle')
    expect(state.elapsedMs).toBe(0)
    expect(state.nextEntityId).toBe(2)
  })

  test('player starts in center of arena', () => {
    const state = createInitialState()
    expect(state.player?.pos.x).toBe(400)
    expect(state.player?.pos.y).toBe(300)
  })
})

describe('Spawning', () => {
  test('spawnWave creates correct number of enemies', () => {
    const state = createInitialState()
    const newState = spawnWave(state, 1)

    expect(newState.enemies).toHaveLength(3)
    expect(newState.wave).toBe(1)
    expect(newState.phase).toBe('playing')
    expect(newState.nextEntityId).toBe(5) // 2 + 3 enemies
  })

  test('spawnWave increments wave number', () => {
    const state = createInitialState()
    const wave1 = spawnWave(state, 1)
    const wave2 = spawnWave(wave1, 2)

    expect(wave2.wave).toBe(2)
    expect(wave2.enemies).toHaveLength(7) // 3 + 4 (wave 2 has 4 enemies)
  })

  test('enemies spawn away from player', () => {
    const state = createInitialState()
    const newState = spawnWave(state, 1)

    for (const enemy of newState.enemies) {
      const dist = vecDistance(enemy.pos, newState.player!.pos)
      expect(dist).toBeGreaterThan(60) // TANK_BODY_RADIUS * 3
    }
  })
})

describe('Player Update', () => {
  test('updatePlayer moves player with input', () => {
    const state = createInitialState()
    const input = createInput({ x: 1, y: 0 }, 0, false) // move right
    const newState = updatePlayer(state, input, 1000) // 1 second

    expect(newState.player?.pos.x).toBeGreaterThan(400)
    expect(newState.player?.vel.x).toBe(200)
  })

  test('updatePlayer clamps to arena bounds', () => {
    const state = createInitialState()
    // Move player to right edge
    const edgeState = {
      ...state,
      player: { ...state.player!, pos: { x: 780, y: 300 } },
    }
    const input = createInput({ x: 1, y: 0 }, 0, false)
    const newState = updatePlayer(edgeState, input, 1000)

    expect(newState.player?.pos.x).toBeLessThanOrEqual(780) // clamped
  })

  test('updatePlayer sets aim angle', () => {
    const state = createInitialState()
    const input = createInput({ x: 0, y: 0 }, Math.PI / 2, false) // aim down
    const newState = updatePlayer(state, input, 16)

    expect(newState.player?.angle).toBeCloseTo(Math.PI / 2)
  })

  test('updatePlayer fires bullet on fire input', () => {
    const state = createInitialState()
    const input = createInput({ x: 0, y: 0 }, 0, true) // fire right
    const newState = updatePlayer(state, input, 16)

    expect(newState.bullets).toHaveLength(1)
    expect(newState.bullets[0].ownerId).toBe(state.player!.id)
    expect(newState.player?.fireCooldown).toBe(300)
  })

  test('updatePlayer respects fire cooldown', () => {
    let state = createInitialState()
    const input = createInput({ x: 0, y: 0 }, 0, true)

    state = updatePlayer(state, input, 16) // first shot
    expect(state.bullets).toHaveLength(1)

    state = updatePlayer(state, input, 16) // immediate second shot (cooldown not elapsed)
    expect(state.bullets).toHaveLength(1) // no new bullet

    state = updatePlayer(state, input, 300) // wait for cooldown
    state = updatePlayer(state, input, 16) // third shot
    expect(state.bullets).toHaveLength(2)
  })
})

describe('Enemy Update', () => {
  test('updateEnemies moves enemies toward player', () => {
    const state = createInitialState()
    const waveState = spawnWave(state, 1)

    const enemy = waveState.enemies[0]
    const initialDist = vecDistance(enemy.pos, waveState.player!.pos)

    const newState = updateEnemies(waveState, 1000) // 1 second

    const updatedEnemy = newState.enemies[0]
    const newDist = vecDistance(updatedEnemy.pos, newState.player!.pos)

    expect(newDist).toBeLessThan(initialDist)
  })

  test('updateEnemies aims enemies at player', () => {
    const state = createInitialState()
    const waveState = spawnWave(state, 1)

    const newState = updateEnemies(waveState, 16)

    for (const enemy of newState.enemies) {
      const toPlayer = vecSub(newState.player!.pos, enemy.pos)
      const expectedAngle = vecToAngle(toPlayer)
      expect(enemy.angle).toBeCloseTo(expectedAngle, 1)
    }
  })

  test('updateEnemies fires bullets when in range', () => {
    const state = createInitialState()
    // Place enemy close to player
    const closeState = {
      ...state,
      player: { ...state.player!, pos: { x: 400, y: 300 } },
      enemies: [
        {
          ...state.enemies[0],
          id: 2,
          pos: { x: 450, y: 300 }, // 50px away
          fireCooldown: 0,
        },
      ],
    }
    const waveState = { ...closeState, wave: 1, phase: 'playing' as const }

    const newState = updateEnemies(waveState, 16)

    // Enemy should fire since in range and cooldown ready
    expect(newState.bullets.length).toBeGreaterThan(0)
    const enemyBullet = newState.bullets.find((b) => b.ownerId === 2)
    expect(enemyBullet).toBeDefined()
  })

  test('updateEnemies does not fire when out of range', () => {
    const state = createInitialState()
    const farState = {
      ...state,
      player: { ...state.player!, pos: { x: 400, y: 300 } },
      enemies: [
        {
          id: 2,
          pos: { x: 100, y: 100 }, // far away
          fireCooldown: 0,
          health: 1,
          maxHealth: 1,
          isPlayer: false,
          color: '#ef4444',
          angle: 0,
          vel: { x: 0, y: 0 },
        },
      ],
      wave: 1,
      phase: 'playing' as const,
    }

    const newState = updateEnemies(farState, 16)
    const enemyBullet = newState.bullets.find((b) => b.ownerId === 2)
    expect(enemyBullet).toBeUndefined()
  })
})

describe('Bullet Update', () => {
  test('updateBullets moves bullets forward', () => {
    const state = createInitialState()
    const bullet = {
      id: 10,
      pos: { x: 400, y: 300 },
      vel: { x: 600, y: 0 }, // moving right
      ownerId: 1,
      damage: 1,
      life: 1500,
    }
    const bulletState = { ...state, bullets: [bullet] }

    const newState = updateBullets(bulletState, 1000) // 1 second

    expect(newState.bullets[0].pos.x).toBe(1000) // 400 + 600
    expect(newState.bullets[0].life).toBe(500)
  })

  test('updateBullets removes expired bullets', () => {
    const state = createInitialState()
    const bullet = {
      id: 10,
      pos: { x: 400, y: 300 },
      vel: { x: 0, y: 0 },
      ownerId: 1,
      damage: 1,
      life: 10,
    }
    const bulletState = { ...state, bullets: [bullet] }

    const newState = updateBullets(bulletState, 16) // life goes to -6

    expect(newState.bullets).toHaveLength(0)
  })

  test('updateBullets removes out-of-bounds bullets', () => {
    const state = createInitialState()
    const bullet = {
      id: 10,
      pos: { x: -100, y: 300 }, // out of bounds
      vel: { x: 0, y: 0 },
      ownerId: 1,
      damage: 1,
      life: 1000,
    }
    const bulletState = { ...state, bullets: [bullet] }

    const newState = updateBullets(bulletState, 16)

    expect(newState.bullets).toHaveLength(0)
  })
})

describe('Collisions', () => {
  test('checkCollisions detects bullet-player collision', () => {
    const state = createInitialState()
    const player = state.player!
    const bullet = {
      id: 10,
      pos: player.pos, // directly on player
      vel: { x: 0, y: 0 },
      ownerId: 2, // enemy bullet
      damage: 1,
      life: 1000,
    }
    const bulletState = { ...state, bullets: [bullet], phase: 'playing' as const }

    const newState = checkCollisions(bulletState)

    expect(newState.player?.health).toBe(2) // 3 - 1
  })

  test('checkCollisions detects bullet-enemy collision', () => {
    const state = createInitialState()
    const waveState = spawnWave(state, 1)
    const enemy = waveState.enemies[0]
    const bullet = {
      id: 10,
      pos: enemy.pos, // directly on enemy
      vel: { x: 0, y: 0 },
      ownerId: waveState.player!.id, // player bullet
      damage: 1,
      life: 1000,
    }
    const bulletState = { ...waveState, bullets: [bullet] }

    const newState = checkCollisions(bulletState)

    expect(newState.enemies).toHaveLength(0) // enemy destroyed
    expect(newState.score).toBe(100) // SCORE_PER_KILL
  })

  test('checkCollisions handles multi-hit enemies', () => {
    const state = createInitialState()
    const waveState = spawnWave(state, 3) // wave 3 has health 2
    const enemy = waveState.enemies[0]
    expect(enemy.maxHealth).toBe(2)

    const bullet = {
      id: 10,
      pos: enemy.pos,
      vel: { x: 0, y: 0 },
      ownerId: waveState.player!.id,
      damage: 1,
      life: 1000,
    }
    const bulletState = { ...waveState, bullets: [bullet] }

    const newState = checkCollisions(bulletState)

    expect(newState.enemies).toHaveLength(1)
    expect(newState.enemies[0].health).toBe(1)
    expect(newState.score).toBe(0) // not dead yet
  })

  test('checkCollisions kills player after 3 hits', () => {
    let state = createInitialState()
    state = { ...state, phase: 'playing' as const, lives: 3 }

    // Hit player 3 times
    for (let i = 0; i < 3; i++) {
      const bullet = {
        id: 10 + i,
        pos: state.player!.pos,
        vel: { x: 0, y: 0 },
        ownerId: 2,
        damage: 1,
        life: 1000,
      }
      state = checkCollisions({ ...state, bullets: [bullet] })
    }

    expect(state.lives).toBe(0)
    expect(state.phase).toBe('gameOver')
    expect(state.player).toBeNull()
  })

  test('checkCollisions respawns player with fewer lives', () => {
    let state = createInitialState()
    state = { ...state, phase: 'playing' as const, lives: 3 }

    // Hit player once (not fatal)
    const bullet = {
      id: 10,
      pos: state.player!.pos,
      vel: { x: 0, y: 0 },
      ownerId: 2,
      damage: 1,
      life: 1000,
    }
    state = checkCollisions({ ...state, bullets: [bullet] })

    expect(state.lives).toBe(2)
    expect(state.player).not.toBeNull()
    expect(state.player?.health).toBe(3) // full health on respawn
    expect(state.player?.pos.x).toBe(400) // center
    expect(state.player?.pos.y).toBe(300)
  })
})

describe('Wave Management', () => {
  test('checkWaveComplete transitions to waveTransition when enemies cleared', () => {
    const state = createInitialState()
    const waveState = spawnWave(state, 1)
    const clearedState = { ...waveState, enemies: [], score: 100, phase: 'playing' as const }

    const newState = checkWaveComplete(clearedState)

    expect(newState.phase).toBe('waveTransition')
    expect(newState.waveTransitionTimer).toBe(2000)
    expect(newState.score).toBe(600) // 100 + 500 wave bonus
  })

  test('checkWaveComplete ends game after max waves', () => {
    const state = createInitialState()
    const maxWaveState = {
      ...state,
      wave: 20,
      maxWaves: 20,
      enemies: [],
      score: 1000,
      phase: 'playing' as const,
    }

    const newState = checkWaveComplete(maxWaveState)

    expect(newState.phase).toBe('gameOver')
    expect(newState.score).toBe(1000 + 500 + 20 * 100) // wave bonus + survival bonus
  })

  test('updateWaveTransition spawns next wave after timer', () => {
    const state = createInitialState()
    const transitionState = {
      ...state,
      wave: 1,
      phase: 'waveTransition' as const,
      waveTransitionTimer: 100,
    }

    const newState = updateWaveTransition(transitionState, 200) // timer expires

    expect(newState.phase).toBe('playing')
    expect(newState.wave).toBe(2)
    expect(newState.enemies.length).toBeGreaterThan(0)
  })

  test('updateWaveTransition decrements timer', () => {
    const state = createInitialState()
    const transitionState = {
      ...state,
      wave: 1,
      phase: 'waveTransition' as const,
      waveTransitionTimer: 2000,
    }

    const newState = updateWaveTransition(transitionState, 500)

    expect(newState.waveTransitionTimer).toBe(1500)
    expect(newState.phase).toBe('waveTransition')
  })
})

describe('Full Tick Integration', () => {
  test('tick advances elapsed time', () => {
    const state = createInitialState()
    const input = createZeroInput()

    const newState = tick(state, input, 1000)

    expect(newState.elapsedMs).toBe(1000)
  })

  test('tick does nothing in idle phase', () => {
    const state = createInitialState()
    const input = createZeroInput()

    const newState = tick(state, input, 1000)

    expect(newState.phase).toBe('idle')
    expect(newState.enemies).toHaveLength(0)
  })

  test('tick processes full game loop in playing phase', () => {
    let state = spawnWave(createInitialState(), 1)
    state = { ...state, phase: 'playing' as const }

    const input = createInput({ x: 0, y: 0 }, 0, false)
    const newState = tick(state, input, 16)

    expect(newState.elapsedMs).toBe(16)
    expect(newState.enemies.length).toBe(3)
    // Enemies should have moved
  })

  test('tick handles wave transition automatically', () => {
    let state = spawnWave(createInitialState(), 1)
    state = { ...state, phase: 'playing' as const, enemies: [], score: 300 }

    const input = createZeroInput()
    const newState = tick(state, input, 2000) // enough to clear transition

    expect(newState.wave).toBe(2)
    expect(newState.phase).toBe('playing')
    expect(newState.enemies.length).toBeGreaterThan(0)
  })
})

describe('Input Helpers', () => {
  test('createInput creates valid input', () => {
    const input = createInput({ x: 1, y: 0 }, Math.PI / 2, true)
    expect(input.moveDir).toEqual({ x: 1, y: 0 })
    expect(input.aimAngle).toBe(Math.PI / 2)
    expect(input.fire).toBe(true)
  })

  test('createZeroInput creates zero input', () => {
    const input = createZeroInput()
    expect(input.moveDir).toEqual({ x: 0, y: 0 })
    expect(input.aimAngle).toBe(0)
    expect(input.fire).toBe(false)
  })
})

describe('Formatting', () => {
  test('formatScore formats with commas', () => {
    expect(formatScore(0)).toBe('0 pts')
    expect(formatScore(100)).toBe('100 pts')
    expect(formatScore(1000)).toBe('1,000 pts')
    expect(formatScore(100000)).toBe('100,000 pts')
  })

  test('formatWave shows current/max', () => {
    expect(formatWave(1, 20)).toBe('Wave 1 / 20')
    expect(formatWave(20, 20)).toBe('Wave 20 / 20')
  })

  test('formatLives shows hearts', () => {
    expect(formatLives(3)).toBe('♥♥♥')
    expect(formatLives(2)).toBe('♥♥♡')
    expect(formatLives(1)).toBe('♥♡♡')
    expect(formatLives(0)).toBe('♡♡♡')
  })
})