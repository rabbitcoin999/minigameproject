import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getGameScores } from '@/lib/database/scores'
import { apiSuccess, unauthorizedResponse, serverErrorResponse, apiError } from '@/lib/api/response'
import { GAME_KEYS } from '@/config/games'
import type { GameKey } from '@/types/game'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const gameKey = searchParams.get('game')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

    let validGameKey: GameKey | null = null
    if (gameKey) {
      if (!GAME_KEYS.includes(gameKey as GameKey)) {
        return apiError('Unknown game key.', 400, 'INVALID_GAME')
      }
      validGameKey = gameKey as GameKey
    }

    const scores = await getGameScores(session.playerId, validGameKey, limit, offset)

    return apiSuccess({ scores, limit, offset })
  } catch (err) {
    console.error('Score history error:', err)
    return serverErrorResponse()
  }
}
