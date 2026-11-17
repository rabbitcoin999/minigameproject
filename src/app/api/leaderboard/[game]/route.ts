import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/database/supabase'
import { getGameByKey } from '@/lib/database/queries'
import { apiSuccess, apiError, serverErrorResponse, notFoundResponse } from '@/lib/api/response'
import { isValidDifficulty } from '@/config/games'
import type { Difficulty } from '@/types/game'

export async function GET(
  request: NextRequest,
  { params }: { params: { game: string } }
) {
  try {
    const { game: gameKey } = params

    const game = await getGameByKey(gameKey)
    if (!game) {
      return notFoundResponse('Game not found.')
    }
    if (!game.is_active) {
      return apiError('This game is currently unavailable.', 403, 'GAME_INACTIVE')
    }

    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') ?? '25', 10) || 25))

    if (difficulty && !isValidDifficulty(difficulty)) {
      return apiError('Invalid difficulty.', 400, 'INVALID_DIFFICULTY')
    }

    // Memory game requires difficulty filter (separate leaderboards)
    if (game.has_difficulty && !difficulty) {
      return apiError(
        'This game requires a difficulty parameter (easy, medium, hard).',
        400,
        'DIFFICULTY_REQUIRED'
      )
    }

    const supabase = getSupabaseAdmin()
    const offset = (page - 1) * pageSize

    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_game_key: gameKey,
      p_difficulty: difficulty ?? null,
      p_limit: pageSize,
      p_offset: offset,
    })

    if (error) {
      console.error('Leaderboard RPC error:', error)
      return serverErrorResponse('Failed to load leaderboard.')
    }

    const entries = (data ?? []).map(
      (row: {
        rank: number
        player_handle: string
        score: number
        completion_time: number | null
        difficulty: string | null
        achieved_at: string
      }) => ({
        rank: row.rank,
        playerId: row.player_handle,
        score: row.score,
        completionTime: row.completion_time,
        difficulty: row.difficulty,
        achievedAt: row.achieved_at,
      })
    )

    return apiSuccess({
      game: gameKey,
      difficulty: difficulty ?? null,
      page,
      pageSize,
      entries,
      hasMore: entries.length === pageSize,
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return serverErrorResponse()
  }
}
