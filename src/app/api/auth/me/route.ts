import { getSession } from '@/lib/auth/session'
import { getPlayerById } from '@/lib/database/queries'
import { apiSuccess, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

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
      },
    })
  } catch (err) {
    console.error('Auth me error:', err)
    return serverErrorResponse()
  }
}
