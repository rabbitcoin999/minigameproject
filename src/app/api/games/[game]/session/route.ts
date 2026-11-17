import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth/session'
import { getGameByKey } from '@/lib/database/queries'
import { getSupabaseAdmin } from '@/lib/database/supabase'
import { apiSuccess, apiError, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/api/response'

// Server-issued gameplay session for anti-cheat.
// Games that need extra protection call this when a play starts; the returned
// token must be sent back with the score submission.

const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes max per game session

export async function POST(
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
    if (!game || !game.is_active) {
      return notFoundResponse('Game not found.')
    }

    const supabase = getSupabaseAdmin()
    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    const { error } = await supabase.from('game_sessions').insert({
      player_id: session.playerId,
      game_id: game.id,
      session_token: token,
      expires_at: expiresAt,
    })

    if (error) {
      console.error('Game session creation error:', error)
      return serverErrorResponse('Failed to create game session.')
    }

    return apiSuccess({ sessionToken: token, expiresAt }, 201)
  } catch (err) {
    console.error('Game session error:', err)
    return serverErrorResponse()
  }
}
