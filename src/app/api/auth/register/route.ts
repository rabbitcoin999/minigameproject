import { NextRequest } from 'next/server'
import { registerSchema } from '@/lib/validation/schema'
import { hashPassword } from '@/lib/auth/password'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { rateLimit, getClientIp } from '@/lib/auth/rate-limit'
import { createPlayer, getPlayerByHandle } from '@/lib/database/queries'
import {
  apiSuccess,
  apiError,
  zodErrorResponse,
  rateLimitResponse,
  serverErrorResponse,
} from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per hour per IP
    const ip = getClientIp(request.headers)
    const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
    if (!limit.allowed) {
      return rateLimitResponse(limit.resetAt)
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return apiError('Invalid JSON body', 400, 'INVALID_BODY')
    }

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error)
    }

    const { playerId, password } = parsed.data

    // Check if handle already exists (case-insensitive)
    const existing = await getPlayerByHandle(playerId)
    if (existing) {
      return apiError('This Player ID is already taken. Please choose another.', 409, 'PLAYER_EXISTS')
    }

    const passwordHash = await hashPassword(password)

    let player
    try {
      player = await createPlayer(playerId, passwordHash)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('already exists') || message.includes('duplicate')) {
        return apiError('This Player ID is already taken. Please choose another.', 409, 'PLAYER_EXISTS')
      }
      throw err
    }

    // Auto-login after registration
    const token = await createSessionToken({
      playerId: player.id,
      playerHandle: player.player_id,
    })
    await setSessionCookie(token)

    return apiSuccess(
      {
        player: {
          id: player.id,
          playerId: player.player_id,
          createdAt: player.created_at,
        },
      },
      201
    )
  } catch (err) {
    console.error('Register error:', err)
    return serverErrorResponse('Registration failed. Please try again.')
  }
}
