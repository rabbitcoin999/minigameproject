// API response types

import type { GameKey, Difficulty } from './game'

export interface ApiError {
  error: string
  code?: string
}

export interface ApiSuccess<T> {
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return 'error' in response
}

// ------------------------------------------------------------
// Client-facing view models (camelCase, as returned by the API)
// ------------------------------------------------------------

export interface PlayerView {
  id: string
  playerId: string
  createdAt: string
}

export interface PersonalBestView {
  gameKey: GameKey
  score: number
  completionTime: number | null
  difficulty: Difficulty | null
  achievedAt: string
}

export interface LeaderboardEntryView {
  rank: number
  playerId: string
  score: number
  completionTime: number | null
  difficulty: Difficulty | null
  achievedAt: string
}

