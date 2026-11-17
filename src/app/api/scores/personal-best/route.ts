import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPersonalBest, getPersonalBests } from '@/lib/database/scores'
import { apiSuccess, unauthorizedResponse, serverErrorResponse, apiError } from '@/lib/api/response'
import { GAME_KEYS } from '@/config/games'
import { isValidDifficulty } from '@/config/games'
import type { GameKey, Difficulty } from '@/types/game'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const gameKey = searchParams.get('game')
    const difficulty = searchParams.get('difficulty')

    // No game param → return all personal bests
    if (!gameKey) {
      const bests = await getPersonalBests(session.playerId)
      return apiSuccess({ personalBests: bests })
    }

    if (!GAME_KEYS.includes(gameKey as GameKey)) {
      return apiError('Unknown game key.', 400, 'INVALID_GAME')
    }

    let diff: Difficulty | null = null
    if (difficulty) {
      if (!isValidDifficulty(difficulty)) {
        return apiError('Invalid difficulty.', 400, 'INVALID_DIFFICULTY')
      }
      diff = difficulty as Difficulty
    }

    const best = await getPersonalBest(session.playerId, gameKey as GameKey, diff)
    return apiSuccess({ personalBest: best })
  } catch (err) {
    console.error('Personal best error:', err)
    return serverErrorResponse()
  }
}
