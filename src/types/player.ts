// Player-related types

import type { PersonalBest } from './game'

export interface Player {
  id: string
  player_id: string
  created_at: string
  updated_at: string
}

export interface PlayerStats {
  id: string
  player_id: string
  total_games_played: number
  total_play_time: number
  updated_at: string
}

export interface AuthSession {
  player: Player
  expiresAt: string
}

export interface PlayerProfile extends Player {
  stats: PlayerStats
  personalBests: PersonalBest[]
}
