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
