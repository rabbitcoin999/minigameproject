import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getPlayerById, updatePlayerHandle, getPlayerByHandle } from '@/lib/database/queries'
import { playerIdSchema } from '@/lib/validation/schema'
import {
  apiSuccess,
  apiError,
  zodErrorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api/response'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const player = await getPlayerById(session.playerId)
    if (!player) {
      return unauthorizedResponse()
    }

    return apiSuccess({
      player: {
        id: player.id,
        playerId: player.player_id,
        createdAt: player.created_at,
        updatedAt: player.updated_at,
      },
    })
  } catch (err) {
    console.error('Players me error:', err)
    return serverErrorResponse()
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body.playerId !== 'string') {
      return apiError('playerId is required.', 400, 'VALIDATION_ERROR')
    }

    const parsed = playerIdSchema.safeParse(body.playerId)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error)
    }

    const newHandle = parsed.data
    const current = await getPlayerById(session.playerId)
    if (!current) {
      return unauthorizedResponse()
    }

    if (current.player_id.toLowerCase() === newHandle.toLowerCase()) {
      return apiSuccess({ player: { id: current.id, playerId: current.player_id, createdAt: current.created_at } })
    }

    const existing = await getPlayerByHandle(newHandle)
    if (existing && existing.id !== current.id) {
      return apiError('This Player ID is already taken. Please choose another.', 409, 'PLAYER_EXISTS')
    }

    const updated = await updatePlayerHandle(current.id, newHandle)
    return apiSuccess({
      player: {
        id: updated.id,
        playerId: updated.player_id,
        createdAt: updated.created_at,
      },
    })
  } catch (err) {
    console.error('Players me PATCH error:', err)
    return serverErrorResponse()
  }
}
