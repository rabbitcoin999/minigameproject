// Snake game logic — pure functions, no React

export const GRID_SIZE = 20
export const TICK_MS = 140
export const POINTS_PER_FOOD = 10

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Position {
  x: number
  y: number
}

export interface SnakeState {
  snake: Position[]
  food: Position
  direction: Direction
  score: number
  gameOver: boolean
}

export function createInitialState(): SnakeState {
  const center = Math.floor(GRID_SIZE / 2)
  return {
    snake: [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
    ],
    food: spawnFood(
      [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center },
      ]
    ),
    direction: 'right',
    score: 0,
    gameOver: false,
  }
}

function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

function spawnFood(snake: Position[]): Position {
  let food: Position
  let attempts = 0
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    attempts++
  } while (attempts < 500 && snake.some((s) => positionsEqual(s, food)))
  return food
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/** Queue a direction change; rejects reversals and duplicates. */
export function nextDirection(current: Direction, requested: Direction): Direction {
  if (requested === current || requested === OPPOSITE[current]) return current
  return requested
}

export function tick(state: SnakeState): SnakeState {
  if (state.gameOver) return state

  const delta = DELTAS[state.direction]
  const head = state.snake[0]
  const newHead: Position = { x: head.x + delta.x, y: head.y + delta.y }

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    return { ...state, gameOver: true }
  }

  // Self collision (note: tail cell moves away this tick unless we eat, so
  // hitting the current tail tip is allowed when not eating)
  const willEat = positionsEqual(newHead, state.food)
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1)
  if (bodyToCheck.some((s) => positionsEqual(s, newHead))) {
    return { ...state, gameOver: true }
  }

  const newSnake = [newHead, ...state.snake]
  if (willEat) {
    return {
      ...state,
      snake: newSnake,
      food: spawnFood(newSnake),
      score: state.score + POINTS_PER_FOOD,
    }
  }
  newSnake.pop()
  return { ...state, snake: newSnake }
}

export function formatSnakeScore(score: number): string {
  return `${score} pts`
}
