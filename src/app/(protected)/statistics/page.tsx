'use client'

import { useEffect, useState } from 'react'
import { AuthGuard } from '@/components/profile/auth-guard'
import { useAuth } from '@/features/auth/use-auth'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { GAMES } from '@/config/games'
import type { PersonalBestView } from '@/types/api'
import type { GameKey } from '@/types/game'

interface StatisticsData {
  stats: {
    totalGamesPlayed: number
    totalPlayTimeMs: number
  }
  personalBests: PersonalBestView[]
  perGameCounts: Record<string, number>
  recentScores: Array<{
    id: string
    score: number
    completion_time: number | null
    difficulty: string | null
    created_at: string
    games: { game_key: GameKey }
  }>
}

function formatPlayTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${Math.floor(ms / 1000)}s`
}

function formatBest(pb: PersonalBestView): string {
  if (pb.gameKey === 'memory') return `${((pb.completionTime ?? 0) / 1000).toFixed(2)}s`
  if (pb.gameKey === 'reaction') return `${pb.score} ms`
  if (pb.gameKey === 'runner') return `${pb.score} m`
  return `${pb.score} pts`
}

function formatRecent(s: {
  score: number
  completion_time: number | null
  games: { game_key: GameKey }
}): string {
  if (s.games.game_key === 'memory') return `${((s.completion_time ?? 0) / 1000).toFixed(2)}s`
  if (s.games.game_key === 'reaction') return `${s.score} ms`
  if (s.games.game_key === 'runner') return `${s.score} m`
  return `${s.score} pts`
}

function StatisticsContent() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/players/me/statistics')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setData(json.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-400" />
      </div>
    )
  }

  if (!data) {
    return <p className="py-24 text-center text-dark-400">Failed to load statistics.</p>
  }

  const maxCount = Math.max(1, ...Object.values(data.perGameCounts))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-white">Statistics</h1>
      <p className="mt-2 text-dark-400">Your performance across all games.</p>

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-dark-800 bg-dark-900 p-5 text-center">
          <div className="text-3xl font-bold text-primary-400">
            {data.stats.totalGamesPlayed}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-dark-400">
            Total Games Played
          </div>
        </div>
        <div className="rounded-xl border border-dark-800 bg-dark-900 p-5 text-center">
          <div className="text-3xl font-bold text-primary-400">
            {formatPlayTime(data.stats.totalPlayTimeMs)}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-dark-400">Total Play Time</div>
        </div>
        <div className="rounded-xl border border-dark-800 bg-dark-900 p-5 text-center">
          <div className="text-3xl font-bold text-primary-400">{data.personalBests.length}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-dark-400">
            Personal Bests Set
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Games played per game */}
        <Card>
          <CardHeader title="📊 Games Played" subtitle="Plays per game (recent history)" />
          <CardBody>
            <ul className="space-y-3">
              {GAMES.map((g) => {
                const count = data.perGameCounts[g.key] ?? 0
                return (
                  <li key={g.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-white">
                        {g.icon} {g.name}
                      </span>
                      <span className="text-dark-400">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-dark-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(count / maxCount) * 100}%`,
                          backgroundColor: g.color,
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        </Card>

        {/* Personal bests */}
        <Card>
          <CardHeader title="🏅 Personal Bests" subtitle="Best score per game" />
          <CardBody>
            {data.personalBests.length === 0 ? (
              <p className="py-6 text-center text-sm text-dark-500">No records yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.personalBests.map((pb) => {
                  const game = GAMES.find((g) => g.key === pb.gameKey)
                  return (
                    <li
                      key={`${pb.gameKey}-${pb.difficulty ?? 'default'}`}
                      className="flex items-center justify-between rounded-lg bg-dark-800/60 px-4 py-2.5 text-sm"
                    >
                      <span className="text-white">
                        {game?.icon} {game?.name}
                        {pb.difficulty && (
                          <span className="ml-2 rounded bg-violet-500/20 px-1.5 py-0.5 text-xs uppercase text-violet-300">
                            {pb.difficulty}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-primary-400">{formatBest(pb)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent scores table */}
      <Card className="mt-6">
        <CardHeader title="🕰️ Recent Scores" subtitle="Your 20 most recent completed games" />
        <CardBody>
          {data.recentScores.length === 0 ? (
            <p className="py-6 text-center text-sm text-dark-500">No games played yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-800 text-left text-xs uppercase tracking-wider text-dark-400">
                    <th className="pb-2 pr-4">Game</th>
                    <th className="pb-2 pr-4">Result</th>
                    <th className="pb-2 pr-4">Difficulty</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentScores.map((s) => {
                    const game = GAMES.find((g) => g.key === s.games.game_key)
                    return (
                      <tr key={s.id} className="border-b border-dark-800/50">
                        <td className="py-2.5 pr-4 text-white">
                          {game?.icon} {game?.name}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-primary-400">
                          {formatRecent(s)}
                        </td>
                        <td className="py-2.5 pr-4 text-dark-300">{s.difficulty ?? '—'}</td>
                        <td className="py-2.5 text-dark-500">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

export default function StatisticsPage() {
  return (
    <AuthGuard>
      <StatisticsContent />
    </AuthGuard>
  )
}
