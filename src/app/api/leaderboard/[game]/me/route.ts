import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getSupabaseAdmin } from '@/lib/database/supabase'
import { getGameByKey } from '@/lib/database/queries'
import { apiSuccess, apiError, serverErrorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api/response'
import { isValidDifficulty } from '@/config/games'
import type { Difficulty } from '@/types/game'

export async function GET(
  request: NextRequest,
  { params }: { params: { game: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const { game: gameKey } = params

    const game = await getGameByKey(gameKey)
    if (!game) {
      return notFoundResponse('Game not found.')
    }

    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')

    if (difficulty && !isValidDifficulty(difficulty)) {
      return apiError('Invalid difficulty.', 400, 'INVALID_DIFFICULTY')
    }

    if (game.has_difficulty && !difficulty) {
      return apiError(
        'This game requires a difficulty parameter (easy, medium, hard).',
        400,
        'DIFFICULTY_REQUIRED'
      )
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('get_player_rank', {
      p_game_key: gameKey,
      p_player_handle: session.playerHandle,
      p_difficulty: difficulty ?? null,
    })

    if (error) {
      console.error('Player rank RPC error:', error)
      return serverErrorResponse('Failed to load ranking.')
    }

    const row = (data ?? [])[0] as
      | {
          rank: number
          score: number
          completion_time: number | null
          difficulty: string | null
          achieved_at: string
          total_players: number
        }
      | undefined

    return apiSuccess({
      game: gameKey,
      difficulty: difficulty ?? null,
      rank: row?.rank ?? null,
      score: row?.score ?? null,
      completionTime: row?.completion_time ?? null,
      achievedAt: row?.achieved_at ?? null,
      totalPlayers: Number(row?.total_players ?? 0),
    })
  } catch (err) {
    console.error('Leaderboard me error:', err)
    return serverErrorResponse()
  }
}
