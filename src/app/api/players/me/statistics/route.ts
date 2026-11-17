import { getSession } from '@/lib/auth/session'
import { getPlayerStats } from '@/lib/database/queries'
import { getGameScores, getPersonalBests } from '@/lib/database/scores'
import { apiSuccess, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const [stats, recentScores, personalBests] = await Promise.all([
      getPlayerStats(session.playerId),
      getGameScores(session.playerId, null, 50, 0),
      getPersonalBests(session.playerId),
    ])

    // Group recent scores by game for per-game play counts
    const perGameCounts: Record<string, number> = {}
    for (const score of recentScores) {
      const gameId = (score as unknown as { games?: { game_key?: string } }).games?.game_key
      if (gameId) {
        perGameCounts[gameId] = (perGameCounts[gameId] ?? 0) + 1
      }
    }

    return apiSuccess({
      stats: {
        totalGamesPlayed: stats?.total_games_played ?? 0,
        totalPlayTimeMs: stats?.total_play_time ?? 0,
      },
      personalBests,
      recentScores: recentScores.slice(0, 20),
      perGameCounts,
    })
  } catch (err) {
    console.error('Statistics error:', err)
    return serverErrorResponse()
  }
}
