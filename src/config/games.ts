import type { GameKey, Difficulty } from '@/types/game'

export interface GameConfig {
  key: GameKey
  name: string
  description: string
  icon: string
  color: string
  gradient: string
  path: string
  scoreLabel: string
  scoreUnit: string
  lowerIsBetter: boolean
  hasDifficulty: boolean
}

export const GAMES: GameConfig[] = [
  {
    key: 'snake',
    name: 'Snake',
    description: 'Classic snake game — eat food, grow longer, avoid hitting walls and yourself.',
    icon: '🐍',
    color: '#22c55e',
    gradient: 'from-green-500 to-emerald-600',
    path: '/games/snake',
    scoreLabel: 'Score',
    scoreUnit: 'pts',
    lowerIsBetter: false,
    hasDifficulty: false,
  },
  {
    key: '2048',
    name: '2048',
    description: 'Slide and merge numbered tiles to reach the legendary 2048 tile.',
    icon: '🔢',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-orange-600',
    path: '/games/2048',
    scoreLabel: 'Score',
    scoreUnit: 'pts',
    lowerIsBetter: false,
    hasDifficulty: false,
  },
  {
    key: 'memory',
    name: 'Memory Game',
    description: 'Flip cards and find all matching pairs as fast as you can.',
    icon: '🃏',
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-600',
    path: '/games/memory',
    scoreLabel: 'Time',
    scoreUnit: 's',
    lowerIsBetter: true,
    hasDifficulty: true,
  },
  {
    key: 'reaction',
    name: 'Reaction Test',
    description: 'Test your reflexes — click the moment the screen turns green.',
    icon: '⚡',
    color: '#ef4444',
    gradient: 'from-red-500 to-rose-600',
    path: '/games/reaction',
    scoreLabel: 'Reaction',
    scoreUnit: 'ms',
    lowerIsBetter: true,
    hasDifficulty: false,
  },
  {
    key: 'whack-a-mole',
    name: 'Whack-a-Mole',
    description: 'Bop moles as they pop up in a frantic 30-second frenzy.',
    icon: '🔨',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-600',
    path: '/games/whack-a-mole',
    scoreLabel: 'Score',
    scoreUnit: 'pts',
    lowerIsBetter: false,
    hasDifficulty: false,
  },
]

export const GAME_KEYS: GameKey[] = GAMES.map((g) => g.key)

export function getGameConfig(key: GameKey): GameConfig {
  const game = GAMES.find((g) => g.key === key)
  if (!game) {
    throw new Error(`Unknown game: ${key}`)
  }
  return game
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function isValidDifficulty(d: string): d is Difficulty {
  return DIFFICULTIES.includes(d as Difficulty)
}
