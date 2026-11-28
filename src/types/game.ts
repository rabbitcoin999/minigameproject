// Game-related types

export type GameKey = 'snake' | '2048' | 'memory' | 'reaction' | 'whack-a-mole' | 'runner' | 'brick-blast' | 'racing' | 'tank-fight'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Game {
  id: string
  game_key: GameKey
  name: string
  description: string | null
  is_active: boolean
  lower_is_better: boolean
  has_difficulty: boolean
}

export interface GameScore {
  id: string
  player_id: string
  game_id: string
  score: number
  completion_time: number | null
  difficulty: Difficulty | null
  created_at: string
}

export interface PersonalBest {
  game_key: GameKey
  score: number
  completion_time: number | null
  difficulty: Difficulty | null
  achieved_at: string
}

export interface LeaderboardEntry {
  rank: number
  player_id: string
  score: number
  completion_time: number | null
  difficulty: Difficulty | null
  achieved_at: string
}
