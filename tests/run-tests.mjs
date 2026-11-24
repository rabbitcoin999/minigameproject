// Simple test runner for pure game logic (no dependencies).
// Run: node tests/run-tests.mjs

import assert from 'node:assert/strict'

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

// ---------- Snake ----------
import {
  createInitialState,
  tick,
  nextDirection,
  GRID_SIZE,
  POINTS_PER_FOOD,
} from '../src/features/snake/logic.ts'

test('snake: initial state is centered with length 3', () => {
  const s = createInitialState()
  assert.equal(s.snake.length, 3)
  assert.equal(s.score, 0)
  assert.equal(s.gameOver, false)
  assert.equal(s.direction, 'right')
})

test('snake: moves right by default', () => {
  const s = createInitialState()
  const next = tick(s)
  assert.equal(next.snake[0].x, s.snake[0].x + 1)
  assert.equal(next.snake.length, 3) // no growth without food
})

test('snake: dies on wall collision', () => {
  const s = createInitialState()
  // Move to right wall
  let state = s
  for (let i = 0; i < GRID_SIZE; i++) {
    state = tick(state)
    if (state.gameOver) break
  }
  assert.equal(state.gameOver, true)
})

test('snake: cannot reverse direction', () => {
  assert.equal(nextDirection('right', 'left'), 'right')
  assert.equal(nextDirection('right', 'up'), 'up')
  assert.equal(nextDirection('up', 'down'), 'up')
})

// ---------- 2048 ----------
import {
  move as move2048,
  hasValidMoves,
  createInitialState as init2048,
  addRandomTile,
  GRID_SIZE as G2048,
} from '../src/features/2048/logic.ts'

test('2048: left slide merges pairs once', () => {
  const grid = [
    [2, 2, 4, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  const result = move2048(grid, 'left')
  assert.deepEqual(result.grid[0], [4, 4, 0, 0])
  assert.equal(result.scoreGained, 4)
  assert.equal(result.moved, true)
})

test('2048: triple tiles merge leftmost first', () => {
  const grid = [
    [2, 2, 2, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  const result = move2048(grid, 'left')
  assert.deepEqual(result.grid[0], [4, 2, 0, 0])
})

test('2048: right slide', () => {
  const grid = [
    [2, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  const result = move2048(grid, 'right')
  assert.deepEqual(result.grid[0], [0, 0, 0, 4])
})

test('2048: up slide merges columns', () => {
  const grid = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [4, 0, 0, 0],
    [4, 0, 0, 0],
  ]
  const result = move2048(grid, 'up')
  assert.equal(result.grid[0][0], 4)
  assert.equal(result.grid[1][0], 8)
  assert.equal(result.scoreGained, 12)
})

test('2048: no move = no change', () => {
  const grid = [
    [2, 4, 8, 16],
    [16, 8, 4, 2],
    [2, 4, 8, 16],
    [16, 8, 4, 2],
  ]
  const result = move2048(grid, 'left')
  assert.equal(result.moved, false)
  assert.deepEqual(result.grid, grid)
})

test('2048: hasValidMoves detects full-but-mergeable grid', () => {
  // Full grid, but column 0 has adjacent 2,2 → mergeable
  const grid = [
    [2, 4, 8, 16],
    [2, 8, 16, 4],
    [4, 16, 2, 8],
    [8, 2, 4, 16],
  ]
  assert.equal(hasValidMoves(grid), true)

  const dead = [
    [2, 4, 8, 16],
    [4, 8, 16, 2],
    [2, 4, 8, 16],
    [4, 8, 16, 2],
  ]
  // Sanity: no equal neighbors horizontally or vertically
  let canMerge = false
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (c < 3 && dead[r][c] === dead[r][c + 1]) canMerge = true
      if (r < 3 && dead[r][c] === dead[r + 1][c]) canMerge = true
    }
  assert.equal(canMerge, false)
  assert.equal(hasValidMoves(dead), false)
})

test('2048: initial state has two tiles', () => {
  const { grid } = init2048()
  const filled = grid.flat().filter((v) => v > 0)
  assert.equal(filled.length, 2)
})

test('2048: addRandomTile fills empty cell', () => {
  const grid = Array.from({ length: G2048 }, () => Array(G2048).fill(0))
  addRandomTile(grid)
  const filled = grid.flat().filter((v) => v > 0)
  assert.equal(filled.length, 1)
  assert.ok([2, 4].includes(filled[0]))
})

// ---------- Memory ----------
import {
  createDeck,
  flipCard,
  unflipMismatched,
  DIFFICULTY_PAIRS,
} from '../src/features/memory/logic.ts'

test('memory: deck has correct size and pairs', () => {
  for (const d of ['easy', 'medium', 'hard']) {
    const deck = createDeck(d)
    assert.equal(deck.length, DIFFICULTY_PAIRS[d] * 2)
    const pairIds = new Set(deck.map((c) => c.pairId))
    assert.equal(pairIds.size, DIFFICULTY_PAIRS[d])
    for (const pid of pairIds) {
      assert.equal(deck.filter((c) => c.pairId === pid).length, 2)
    }
  }
})

test('memory: matching pair stays matched and game completes', () => {
  const deck = createDeck('easy')
  const cardA = deck[0]
  const cardB = deck.find((c) => c.pairId === cardA.pairId && c.id !== cardA.id)

  const first = flipCard(deck, deck.indexOf(cardA), 0)
  assert.equal(first.moves, 0) // first flip of a pair isn't a move

  const second = flipCard(first.cards, deck.indexOf(cardB), first.moves)
  assert.equal(second.isMatch, true)
  assert.equal(second.moves, 1)
  assert.equal(second.allMatched, DIFFICULTY_PAIRS.easy === 1 ? true : false)
})

test('memory: mismatch stays unflipped after unflipMismatched', () => {
  const deck = createDeck('easy')
  // Find two cards with different pairIds
  const a = deck[0]
  const b = deck.find((c) => c.pairId !== a.pairId)

  const first = flipCard(deck, deck.indexOf(a), 0)
  const second = flipCard(first.cards, deck.indexOf(b), first.moves)
  assert.equal(second.isMatch, false)

  const unflipped = unflipMismatched(second.cards)
  assert.equal(unflipped.filter((c) => c.flipped && !c.matched).length, 0)
})

test('memory: cannot flip matched or already-flipped card', () => {
  const deck = createDeck('easy')
  const a = deck[0]
  const b = deck.find((c) => c.pairId === a.pairId && c.id !== a.id)
  const first = flipCard(deck, deck.indexOf(a), 0)
  const second = flipCard(first.cards, deck.indexOf(b), first.moves)
  // Both are now matched — flipping again should return null
  assert.equal(flipCard(second.cards, deck.indexOf(a), 0), null)
})

// ---------- Reaction ----------
import {
  randomDelay,
  averageReaction,
  ratingFor,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  TOTAL_ROUNDS,
} from '../src/features/reaction/logic.ts'

test('reaction: delay within bounds', () => {
  for (let i = 0; i < 100; i++) {
    const d = randomDelay()
    assert.ok(d >= MIN_DELAY_MS && d <= MAX_DELAY_MS)
  }
})

test('reaction: average calculation', () => {
  assert.equal(averageReaction([100, 200, 300]), 200)
  assert.equal(averageReaction([]), 0)
  assert.equal(averageReaction([150]), 150)
})

test('reaction: ratings exist for all ranges', () => {
  assert.ok(ratingFor(100).label)
  assert.ok(ratingFor(250).label)
  assert.ok(ratingFor(350).label)
  assert.ok(ratingFor(450).label)
  assert.ok(ratingFor(900).label)
})

// ---------- Whack-a-Mole ----------
import {
  difficultyAt,
  spawnMole,
  pruneMoles,
  pickCell,
  GAME_DURATION_MS,
  GRID_COLS,
  GRID_ROWS,
} from '../src/features/whack-a-mole/logic.ts'

test('whack: difficulty increases over time (durations shrink)', () => {
  const early = difficultyAt(0)
  const late = difficultyAt(GAME_DURATION_MS - 1)
  assert.ok(early.upDurationMs > late.upDurationMs)
  assert.ok(early.spawnGapMs > late.spawnGapMs)
  // Never below sensible floor
  assert.ok(late.upDurationMs >= 300)
  assert.ok(late.spawnGapMs >= 300)
})

test('whack: spawn puts mole in empty cell', () => {
  const existing = [{ id: 1, cell: 0, isBonus: false, despawnsAt: Infinity }]
  for (let i = 0; i < 50; i++) {
    const mole = spawnMole(1000, 500, existing)
    assert.ok(mole)
    assert.notEqual(mole.cell, 0)
  }
})

test('whack: prune removes expired moles', () => {
  const moles = [
    { id: 1, cell: 0, isBonus: false, despawnsAt: 900 },
    { id: 2, cell: 4, isBonus: true, despawnsAt: 1100 },
  ]
  const pruned = pruneMoles(moles, 1000)
  assert.equal(pruned.length, 1)
  assert.equal(pruned[0].id, 2)
})

test('whack: pickCell returns null when grid is full', () => {
  const total = GRID_COLS * GRID_ROWS
  const all = Array.from({ length: total }, (_, i) => ({
    id: i,
    cell: i,
    isBonus: false,
    despawnsAt: Infinity,
  }))
  assert.equal(pickCell(all), null)
})

// ---------- Runner ----------
import {
  createInitialState as createRunnerState,
  tick as tickRunner,
  shiftLane,
  queueJump,
  speedAt,
  formatDistance,
  SPAWN_Z,
  DESPAWN_Z,
  COLLISION_HALF_Z,
  LOW_HEIGHT,
  TALL_HEIGHT,
  BASE_SPEED,
  MAX_SPEED,
  RAMP_DISTANCE,
  MIN_ROW_GAP_METERS,
  SPAWN_JITTER,
  LANE_WIDTH,
  LANE_COUNT,
  INITIAL_GRACE_METERS,
  // types used for JSDoc annotations in tests:
  // RunnerState, Lane, Obstacle
} from '../src/features/runner/logic.ts'

test('runner: initial state has correct defaults', () => {
  const s = createRunnerState()
  assert.equal(s.status, 'running')
  assert.equal(s.lane, 1)
  assert.equal(s.distance, 0)
  assert.equal(s.speed, BASE_SPEED)
  assert.equal(s.x, 0)
  assert.equal(s.y, 0)
  assert.equal(s.vy, 0)
  assert.equal(s.jumpQueued, false)
  assert.equal(s.obstacles.length, 0)
  assert.equal(s.metersToNextRow, INITIAL_GRACE_METERS)
  assert.equal(s.lastFreeLane, null)
})

test('runner: tick advances distance by speed * dt', () => {
  let s = createRunnerState()
  for (let i = 0; i < 60; i++) s = tickRunner(s)
  // 60 ticks = 1s. Speed ramps from 12, so distance slightly > 12 (exact: ~12.07)
  assert.ok(s.distance > 12 && s.distance < 12.2)
  assert.equal(s.status, 'running')
})

test('runner: shiftLane clamps at edges', () => {
  let s = createRunnerState()
  // lane 1 -> left -> lane 0
  s = shiftLane(s, -1)
  assert.equal(s.lane, 0)
  // left again -> still 0
  s = shiftLane(s, -1)
  assert.equal(s.lane, 0)
  // right twice -> lane 2
  s = shiftLane(s, 1)
  s = shiftLane(s, 1)
  assert.equal(s.lane, 2)
  // right again -> still 2
  s = shiftLane(s, 1)
  assert.equal(s.lane, 2)
})

test('runner: lateral lerp moves x toward target lane', () => {
  let s = createRunnerState()
  s = shiftLane(s, -1) // target lane 0, x = -2
  // x starts at 0, moves toward -2 at LATERAL_SPEED (12) * dt
  for (let i = 0; i < 30; i++) s = tickRunner(s)
  assert.ok(s.x < -1.9 && s.x > -2.1) // snapped close to -2
})

test('runner: jump arc peaks in expected range', () => {
  let s = createRunnerState()
  s = queueJump(s) // vy = 11.5
  let maxY = 0
  for (let i = 0; i < 60; i++) {
    s = tickRunner(s)
    if (s.y > maxY) maxY = s.y
    if (s.y === 0 && s.vy === 0) break // landed
  }
  // apex = 11.5^2 / (2*38) ≈ 1.74
  assert.ok(maxY > 1.6 && maxY < 1.9)
})

test('runner: queued jump executes on landing', () => {
  let s = createRunnerState()
  s = queueJump(s) // first jump - vy set immediately since grounded
  // Wait for apex then land
  for (let i = 0; i < 40; i++) s = tickRunner(s)
  // Now player is grounded (y=0). Queue a jump *while airborne*:
  s = queueJump(s) // grounded -> executes immediately, vy = JUMP_VELOCITY
  assert.ok(s.vy > 0)
  assert.equal(s.jumpQueued, false)
  // To test queued jump, we need to queue WHILE airborne
  // Do a jump, then before landing, queue another
  s = createRunnerState()
  s = queueJump(s) // jump 1
  for (let i = 0; i < 20; i++) s = tickRunner(s) // still airborne
  s = queueJump(s) // queue jump 2
  assert.equal(s.jumpQueued, true)
  // Land
  for (let i = 0; i < 30; i++) s = tickRunner(s)
  assert.equal(s.jumpQueued, false)
  assert.ok(s.vy > 0)
})

test('runner: low obstacle kills grounded player, airborne survives', () => {
  // Manually insert a low obstacle at collision zone
  let s = createRunnerState()
  const lowObs = {
    id: 1,
    lane: 1,
    kind: 'low',
    z: -0.5, // inside COLLISION_HALF_Z
    x: 0,
    width: 6.4,
    depth: 1.2,
    height: LOW_HEIGHT,
  }
  s = { ...s, obstacles: [lowObs], nextObstacleId: 2 }
  // Grounded: y=0 < LOW_HEIGHT (0.8) → game over
  s = tickRunner(s)
  assert.equal(s.status, 'over')

  // Reset with player airborne above LOW_HEIGHT
  s = createRunnerState()
  s = { ...s, obstacles: [lowObs], nextObstacleId: 2, y: 1.2, vy: 0 }
  s = tickRunner(s)
  assert.equal(s.status, 'running')
})

test('runner: tall obstacle kills even at jump height', () => {
  let s = createRunnerState()
  const tallObs = {
    id: 1,
    lane: 1,
    kind: 'tall',
    z: -0.5,
    x: 0,
    width: 1.6,
    depth: 1.2,
    height: TALL_HEIGHT,
  }
  // Player at y=1.2 (cleared low), tall is 2.2 → bottom 1.2 < 2.2 = collision
  s = { ...s, obstacles: [tallObs], nextObstacleId: 2, y: 1.2, vy: 0 }
  s = tickRunner(s)
  assert.equal(s.status, 'over')
})

test('runner: obstacles despawn and list stays bounded', () => {
  let s = createRunnerState()
  // Simulate ~30s worth of ticks
  for (let i = 0; i < 1800; i++) s = tickRunner(s)
  // All obstacles beyond DESPAWN_Z should be removed
  for (const o of s.obstacles) {
    assert.ok(o.z <= DESPAWN_Z)
  }
  // List size bounded (approx: spawn rate * 30s max)
  assert.ok(s.obstacles.length < 200)
})

test('runner: speedAt ramps monotonically and caps', () => {
  assert.equal(speedAt(0), BASE_SPEED)
  const mid = speedAt(RAMP_DISTANCE / 2)
  assert.ok(mid > BASE_SPEED && mid < MAX_SPEED)
  assert.equal(speedAt(RAMP_DISTANCE), MAX_SPEED)
  assert.equal(speedAt(RAMP_DISTANCE * 2), MAX_SPEED)
})

test('runner: row gap floor enforced with jitter', () => {
  let s = createRunnerState()
  const rowDistances = []
  let lastSpawnDistance = -1
  // Simulate and record spawn events (dedup by distance)
  for (let i = 0; i < 1000; i++) {
    const prevLen = s.obstacles.length
    s = tickRunner(s)
    if (s.obstacles.length > prevLen && s.distance !== lastSpawnDistance) {
      rowDistances.push(s.distance)
      lastSpawnDistance = s.distance
    }
  }
  // Check consecutive row distances respect MIN_ROW_GAP_METERS * (1 - JITTER)
  for (let i = 1; i < rowDistances.length; i++) {
    const gap = rowDistances[i] - rowDistances[i - 1]
    const minGap = MIN_ROW_GAP_METERS * (1 - SPAWN_JITTER) - 0.01 // epsilon
    assert.ok(gap >= minGap, `gap ${gap} < min ${minGap}`)
  }
})

test('runner: solvability — never 3 tall in one row, consecutive doubles within 1 lane', () => {
  let s = createRunnerState()
  let prevFreeLane = null
  for (let i = 0; i < 5000; i++) {
    const prevLen = s.obstacles.length
    s = tickRunner(s)
    if (s.obstacles.length > prevLen) {
      // New row spawned
      const newOnes = s.obstacles.filter(o => o.z === SPAWN_Z && o.kind === 'tall')
      assert.ok(newOnes.length <= 2, 'more than 2 tall obstacles in one row')
      if (newOnes.length === 2) {
        // Find the free lane
        const usedLanes = newOnes.map(o => o.lane)
        const freeLane = [0, 1, 2].find(l => !usedLanes.includes(l))
        if (prevFreeLane !== null) {
          assert.ok(Math.abs(freeLane - prevFreeLane) <= 1, 'double row free lane jumped >1')
        }
        prevFreeLane = freeLane
      }
    }
  }
})

test('runner: formatDistance uses comma separator', () => {
  assert.equal(formatDistance(0), '0 m')
  assert.equal(formatDistance(123), '123 m')
  assert.equal(formatDistance(1234), '1,234 m')
  assert.equal(formatDistance(1234567), '1,234,567 m')
})

// ----------
// ---------- Brick Blast ----------
import {
  createInitialState as createBrickBlastState,
  tick as tickBrickBlast,
  launchBall as launchBrickBlast,
  updatePaddle as updateBrickBlastPaddle,
  nextLevel as nextBrickBlastLevel,
  restartGame as restartBrickBlast,
  createLevelBricks as createBrickBlastBricks,
  circleRectCollision as brickCircleRectCollision,
  rectFromPos as brickRectFromPos,
} from '../src/features/brick-blast/physics.ts'
import {
  GAME_WIDTH as BB_WIDTH,
  GAME_HEIGHT as BB_HEIGHT,
  BALL_RADIUS as BB_BALL_RADIUS,
  INITIAL_PADDLE_WIDTH as BB_PADDLE_WIDTH,
  INITIAL_LIVES as BB_INITIAL_LIVES,
  LEVEL_CONFIGS as BB_LEVEL_CONFIGS,
} from '../src/features/brick-blast/constants.ts'
import { BRICK_CONFIGS as BB_BRICK_CONFIGS } from '../src/features/brick-blast/types.ts'

test('brick-blast: initial state has correct defaults', () => {
  const s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  assert.equal(s.phase, 'idle')
  assert.equal(s.score, 0)
  assert.equal(s.lives, BB_INITIAL_LIVES)
  assert.equal(s.level, 1)
  assert.equal(s.ball.launched, false)
  assert.ok(s.ball.speed > 0)
  assert.ok(s.paddle.width > 0)
  assert.equal(s.bricks.length, 0) // bricks are created separately by createLevelBricks
  assert.equal(s.canvasWidth, BB_WIDTH)
  assert.equal(s.canvasHeight, BB_HEIGHT)
})

test('brick-blast: level 1 bricks are created', () => {
  const s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  const bricks = createBrickBlastBricks(s, 1)
  assert.ok(bricks.length > 0)
  const destructible = bricks.filter(b => b.type !== 'unbreakable')
  assert.ok(destructible.length > 0)
  assert.ok(bricks.every(b => b.id >= 0))
  assert.ok(bricks.every(b => b.hitsRemaining > 0 || b.type === 'unbreakable'))
})

test('brick-blast: brick configs are correct', () => {
  assert.equal(BB_BRICK_CONFIGS.normal.hits, 1)
  assert.equal(BB_BRICK_CONFIGS.hard.hits, 2)
  assert.equal(BB_BRICK_CONFIGS.unbreakable.hits, -1)
  assert.equal(BB_BRICK_CONFIGS.explosive.hits, 1)
  assert.equal(BB_BRICK_CONFIGS.multiplier.hits, 1)

  assert.equal(BB_BRICK_CONFIGS.normal.points, 10)
  assert.equal(BB_BRICK_CONFIGS.hard.points, 25)
  assert.equal(BB_BRICK_CONFIGS.explosive.points, 50)
  assert.equal(BB_BRICK_CONFIGS.multiplier.points, 5)
})

test('brick-blast: ball launch works', () => {
  const s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  const launched = launchBrickBlast(s)
  assert.equal(launched.phase, 'playing')
  assert.equal(launched.ball.launched, true)
  assert.ok(launched.ball.velocity.x !== 0 || launched.ball.velocity.y !== 0)
  assert.ok(launched.ball.velocity.y < 0) // upward
})

test('brick-blast: paddle update and clamping', () => {
  const s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  const launched = launchBrickBlast(s)

  const right = updateBrickBlastPaddle(launched, BB_WIDTH / 2 + 100, 1/60)
  assert.ok(right.paddle.position.x > launched.paddle.position.x)

  const left = updateBrickBlastPaddle(launched, BB_WIDTH / 2 - 100, 1/60)
  assert.ok(left.paddle.position.x < launched.paddle.position.x)

  const leftClamped = updateBrickBlastPaddle(launched, 0, 1/60)
  const rightClamped = updateBrickBlastPaddle(launched, BB_WIDTH * 2, 1/60)
  assert.ok(leftClamped.paddle.position.x > 0)
  assert.ok(rightClamped.paddle.position.x < BB_WIDTH)
})

test('brick-blast: circle-rect collision detection', () => {
  // Circle center inside rect - should hit with penetration
  const center = { x: 92, y: 92 }
  const radius = 10
  const rect = { x: 90, y: 90, width: 20, height: 20 }

  const hit = brickCircleRectCollision(center, radius, rect)
  assert.equal(hit.hit, true)
  assert.ok(hit.penetration > 0)

  const far = { x: 200, y: 200 }
  const miss = brickCircleRectCollision(far, radius, rect)
  assert.equal(miss.hit, false)
})

test('brick-blast: tick advances ball', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)
  const startY = s.ball.position.y
  for (let i = 0; i < 10; i++) s = tickBrickBlast(s, 1/60)
  assert.ok(s.ball.position.y < startY)
})

test('brick-blast: wall collisions reflect', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)

  // Left wall
  s = { ...s, ball: { ...s.ball, position: { x: s.ball.radius + 1, y: BB_HEIGHT / 2 }, velocity: { x: -100, y: 0 } } }
  s = tickBrickBlast(s, 1/60)
  assert.ok(s.ball.velocity.x > 0)

  // Right wall
  s = { ...s, ball: { ...s.ball, position: { x: BB_WIDTH - s.ball.radius - 1, y: BB_HEIGHT / 2 }, velocity: { x: 100, y: 0 } } }
  s = tickBrickBlast(s, 1/60)
  assert.ok(s.ball.velocity.x < 0)

  // Top wall
  s = { ...s, ball: { ...s.ball, position: { x: BB_WIDTH / 2, y: s.ball.radius + 1 }, velocity: { x: 0, y: -100 } } }
  s = tickBrickBlast(s, 1/60)
  assert.ok(s.ball.velocity.y > 0)
})

test('brick-blast: paddle collision reflects up', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)

  s = {
    ...s,
    ball: {
      ...s.ball,
      position: { x: s.paddle.position.x, y: s.paddle.position.y - s.paddle.height / 2 - s.ball.radius - 1 },
      velocity: { x: 0, y: 200 },
    },
  }
  s = tickBrickBlast(s, 1/60)
  assert.ok(s.ball.velocity.y < 0)
})

test('brick-blast: life loss and game over', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)

  // Game over - 1 life
  s = { ...s, ball: { ...s.ball, position: { x: BB_WIDTH / 2, y: BB_HEIGHT + s.ball.radius * 3 }, velocity: { x: 0, y: 200 } }, lives: 1 }
  s = tickBrickBlast(s, 1/60)
  assert.equal(s.lives, 0)
  assert.equal(s.phase, 'gameOver')

  // Continue with lives
  s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)
  s = { ...s, ball: { ...s.ball, position: { x: BB_WIDTH / 2, y: BB_HEIGHT + s.ball.radius * 3 }, velocity: { x: 0, y: 200 } }, lives: 3 }
  s = tickBrickBlast(s, 1/60)
  assert.equal(s.lives, 2)
  assert.equal(s.phase, 'idle')
  assert.equal(s.ball.launched, false)
})

test('brick-blast: level progression', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)
  s = { ...s, bricks: [], phase: 'levelComplete' }
  s = nextBrickBlastLevel(s)
  assert.equal(s.level, 2)
  assert.equal(s.phase, 'idle')
  assert.ok(s.bricks.length > 0)
  assert.equal(s.ball.launched, false)
  assert.ok(s.ball.speed > 0)
})

test('brick-blast: game restart', () => {
  let s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
  s = launchBrickBlast(s)
  s = { ...s, phase: 'gameOver', score: 1000, lives: 0, level: 3 }
  s = restartBrickBlast(s)
  assert.equal(s.phase, 'idle')
  assert.equal(s.score, 0)
  assert.equal(s.lives, BB_INITIAL_LIVES)
  assert.equal(s.level, 1)
  assert.equal(s.ball.launched, false)
})

test('brick-blast: multiple levels have increasing difficulty', () => {
  for (let i = 1; i <= BB_LEVEL_CONFIGS.length; i++) {
    const s = createBrickBlastState(BB_WIDTH, BB_HEIGHT)
    const bricks = createBrickBlastBricks({ ...s, level: i }, i)
    const config = BB_LEVEL_CONFIGS[Math.min(i - 1, BB_LEVEL_CONFIGS.length - 1)]
    assert.ok(bricks.length >= config.rows * config.cols * 0.8)
  }
})

// ---------- Racing ----------
import { formatLapTime } from '../src/features/racing/format.ts'
import { validateScoreRules } from '../src/lib/validation/score-rules.ts'

test('racing: formatLapTime formats m:ss.mmm', () => {
  assert.equal(formatLapTime(88900), '1:28.900')
  assert.equal(formatLapTime(75007), '1:15.007')
  assert.equal(formatLapTime(5), '0:00.005')
  assert.equal(formatLapTime(600000), '10:00.000')
})

test('racing: score rules accept plausible laps and reject impossible ones', () => {
  const base = { gameKey: 'racing', completionTime: null, difficulty: null }
  assert.equal(validateScoreRules({ ...base, score: 88900, playDurationMs: 270000 }).valid, true)
  assert.equal(validateScoreRules({ ...base, score: 88900, playDurationMs: null }).valid, true)
  assert.equal(validateScoreRules({ ...base, score: 1200, playDurationMs: 270000 }).valid, false)
  assert.equal(validateScoreRules({ ...base, score: 88900, playDurationMs: 60000 }).valid, false)
  assert.equal(validateScoreRules({ ...base, score: 950000, playDurationMs: 2000000 }).valid, false)
})

// ----------
let passed = 0
let failed = 0
for (const { name, fn } of tests) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
  }
}
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
