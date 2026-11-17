import { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/validation/schema'
import { verifyPassword } from '@/lib/auth/password'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { rateLimit, getClientIp } from '@/lib/auth/rate-limit'
import { getPlayerByHandle } from '@/lib/database/queries'
import {
  apiSuccess,
  apiError,
  zodErrorResponse,
  rateLimitResponse,
  serverErrorResponse,
} from '@/lib/api/response'

// Constant-time-ish dummy hash verification to prevent user enumeration timing attacks
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 login attempts per 15 minutes per IP
    const ip = getClientIp(request.headers)
    const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return rateLimitResponse(limit.resetAt)
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return apiError('Invalid JSON body', 400, 'INVALID_BODY')
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error)
    }

    const { playerId, password } = parsed.data

    const player = await getPlayerByHandle(playerId)

    // Always run a hash comparison to keep response time consistent
    const validPassword = await verifyPassword(
      password,
      player?.password_hash ?? DUMMY_HASH
    )

    if (!player || !validPassword) {
      return apiError('Invalid Player ID or password.', 401, 'INVALID_CREDENTIALS')
    }

    const token = await createSessionToken({
      playerId: player.id,
      playerHandle: player.player_id,
    })
    await setSessionCookie(token)

    return apiSuccess({
      player: {
        id: player.id,
        playerId: player.player_id,
        createdAt: player.created_at,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return serverErrorResponse('Login failed. Please try again.')
  }
}
