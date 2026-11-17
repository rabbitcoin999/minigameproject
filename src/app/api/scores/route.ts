import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { scoreSubmissionSchema } from '@/lib/validation/schema'
import { validateScoreRules } from '@/lib/validation/score-rules'
import { getGameByKey } from '@/lib/database/queries'
import { submitScore } from '@/lib/database/scores'
import { rateLimit, getClientIp } from '@/lib/auth/rate-limit'

import {
  apiSuccess,
  apiError,
  zodErrorResponse,
  unauthorizedResponse,
  rateLimitResponse,
  serverErrorResponse,
} from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse('You must be logged in to submit a score.')
    }

    // Rate limit: 30 score submissions per minute per player
    const limit = rateLimit(`score:${session.playerId}`, 30, 60 * 1000)
    if (!limit.allowed) {
      return rateLimitResponse(limit.resetAt)
    }

    // Also rate limit by IP to prevent one IP flooding with many accounts
    const ipLimit = rateLimit(`score-ip:${getClientIp(request.headers)}`, 120, 60 * 1000)
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.resetAt)
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return apiError('Invalid JSON body', 400, 'INVALID_BODY')
    }

    const parsed = scoreSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error)
    }

    const { gameKey, score, completionTime, difficulty, durationMs, sessionToken } = parsed.data

    // Verify the game exists and is active
    const game = await getGameByKey(gameKey)
    if (!game) {
      return apiError('Game not found.', 404, 'GAME_NOT_FOUND')
    }
    if (!game.is_active) {
      return apiError('This game is currently unavailable.', 403, 'GAME_INACTIVE')
    }

    // Server-side game-specific validation (anti-cheat)
    const validation = validateScoreRules({
      gameKey,
      score,
      completionTime: completionTime ?? null,
      difficulty: difficulty ?? null,
      playDurationMs: durationMs ?? null,
    })

    if (!validation.valid) {
      return apiError(validation.reason ?? 'Invalid score submission.', 422, 'SCORE_REJECTED')
    }

    // Optional: verify session token if the game issues one
    if (sessionToken) {
      const sessionValid = await verifyGameSession(sessionToken, session.playerId, game.id)
      if (!sessionValid) {
        return apiError('Invalid or expired game session.', 422, 'INVALID_GAME_SESSION')
      }
    }

    const result = await submitScore({
      playerId: session.playerId,
      gameId: game.id,
      score,
      completionTime: completionTime ?? null,
      difficulty: difficulty ?? null,
      playDurationMs: durationMs ?? null,
      sessionToken: sessionToken ?? null,
    })

    return apiSuccess(
      {
        scoreId: result.scoreId,
        isNewPersonalBest: result.isNewPersonalBest,
        previousBest: result.previousBest,
        submittedScore: score,
      },
      201
    )
  } catch (err) {
    console.error('Score submission error:', err)
    return serverErrorResponse('Failed to save score. Please try again.')
  }
}

async function verifyGameSession(
  token: string,
  playerId: string,
  gameId: string
): Promise<boolean> {
  const { getSupabaseAdmin } = await import('@/lib/database/supabase')
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('game_sessions')
    .select('id, completed, expires_at')
    .eq('session_token', token)
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .maybeSingle()

  if (error || !data) return false
  if (data.completed) return false // session already used
  return new Date(data.expires_at) > new Date()
}
