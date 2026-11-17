// 2048 game logic — pure functions, no React

export const GRID_SIZE = 4

export type Grid = number[][] // [row][col], 0 = empty

export interface MoveResult {
  grid: Grid
  scoreGained: number
  moved: boolean
}

export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
}

export function createInitialState(): { grid: Grid; score: number } {
  const grid = createEmptyGrid()
  addRandomTile(grid)
  addRandomTile(grid)
  return { grid, score: 0 }
}

export function addRandomTile(grid: Grid): void {
  const empty: Array<[number, number]> = []
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c])
    }
  }
  if (empty.length === 0) return
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  grid[r][c] = Math.random() < 0.9 ? 2 : 4
}

function slideAndMergeRow(row: number[]): { row: number[]; gained: number; moved: boolean } {
  const nonZero = row.filter((v) => v !== 0)
  const result: number[] = []
  let gained = 0
  let i = 0
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const merged = nonZero[i] * 2
      result.push(merged)
      gained += merged
      i += 2
    } else {
      result.push(nonZero[i])
      i += 1
    }
  }
  while (result.length < GRID_SIZE) result.push(0)

  const moved = result.some((v, idx) => v !== row[idx])
  return { row: result, gained, moved }
}

function transpose(grid: Grid): Grid {
  return grid[0].map((_, c) => grid.map((row) => row[c]))
}

function reverseRows(grid: Grid): Grid {
  return grid.map((row) => [...row].reverse())
}

export function move(grid: Grid, direction: 'up' | 'down' | 'left' | 'right'): MoveResult {
  let working =
    direction === 'up'
      ? transpose(grid)
      : direction === 'down'
        ? reverseRows(transpose(grid))
        : direction === 'right'
          ? reverseRows(grid)
          : grid

  let gained = 0
  let moved = false
  working = working.map((row) => {
    const res = slideAndMergeRow(row)
    gained += res.gained
    if (res.moved) moved = true
    return res.row
  })

  let final: Grid
  if (direction === 'up') final = transpose(working)
  else if (direction === 'down') final = transpose(reverseRows(working))
  else if (direction === 'right') final = reverseRows(working)
  else final = working

  return { grid: final, scoreGained: gained, moved }
}

export function hasValidMoves(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) return true
      if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return true
      if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return true
    }
  }
  return false
}

export const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  2: { bg: '#3a3a4a', fg: '#e2e8f0' },
  4: { bg: '#4a4a5e', fg: '#e2e8f0' },
  8: { bg: '#f59e0b', fg: '#ffffff' },
  16: { bg: '#ea8a0a', fg: '#ffffff' },
  32: { bg: '#e0760a', fg: '#ffffff' },
  64: { bg: '#d96206', fg: '#ffffff' },
  128: { bg: '#22c55e', fg: '#ffffff' },
  256: { bg: '#16a34a', fg: '#ffffff' },
  512: { bg: '#15803d', fg: '#ffffff' },
  1024: { bg: '#3b82f6', fg: '#ffffff' },
  2048: { bg: '#8b5cf6', fg: '#ffffff' },
}
