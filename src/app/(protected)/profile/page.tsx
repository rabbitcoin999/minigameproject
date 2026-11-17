'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/profile/auth-guard'
import { useAuth } from '@/features/auth/use-auth'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { GAMES, getGameConfig } from '@/config/games'
import type { PersonalBestView } from '@/types/api'
import type { GameKey } from '@/types/game'

interface HistoryScore {
  id: string
  score: number
  completionTime: number | null
  difficulty: string | null
  createdAt: string
  game: { gameKey: GameKey }
}

function ProfileContent() {
  const { player } = useAuth()
  const [bests, setBests] = useState<PersonalBestView[]>([])
  const [history, setHistory] = useState<HistoryScore[]>([])
  const [totalPlayed, setTotalPlayed] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!player) return

    Promise.all([
      fetch('/api/scores/personal-best').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/scores/history?limit=10').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/players/me/statistics').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pbRes, histRes, statsRes]) => {
        if (pbRes?.data?.personalBests) setBests(pbRes.data.personalBests as PersonalBestView[])
        if (histRes?.data?.scores) {
          setHistory(
            histRes.data.scores.map(
              (s: {
                id: string
                score: number
                completion_time: number | null
                difficulty: string | null
                created_at: string
                games: { game_key: GameKey }
              }) => ({
                id: s.id,
                score: s.score,
                completionTime: s.completion_time,
                difficulty: s.difficulty,
                createdAt: s.created_at,
                game: { gameKey: s.games.game_key },
              })
            )
          )
        }
        if (statsRes?.data?.stats) setTotalPlayed(statsRes.data.stats.totalGamesPlayed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [player])

  const formatBest = (pb: PersonalBestView): string => {
    if (pb.gameKey === 'memory') return `${((pb.completionTime ?? 0) / 1000).toFixed(2)}s`
    if (pb.gameKey === 'reaction') return `${pb.score} ms`
    return `${pb.score} pts`
  }

  const formatHistory = (s: HistoryScore): string => {
    if (s.game.gameKey === 'memory')
      return `${((s.completionTime ?? 0) / 1000).toFixed(2)}s`
    if (s.game.gameKey === 'reaction') return `${s.score} ms`
    return `${s.score} pts`
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Player header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dark-800 bg-gradient-to-r from-dark-900 to-dark-800 px-6 py-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-3xl font-bold text-primary-400">
            {player?.playerId.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{player?.playerId}</h1>
            <p className="text-sm text-dark-400">
              Member since{' '}
              {player && new Date(player.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-400">{totalPlayed}</div>
          <div className="text-xs uppercase tracking-wider text-dark-400">Games Played</div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Best records */}
        <Card>
          <CardHeader title="🏅 Best Records" subtitle="Your personal bests per game" />
          <CardBody>
            {loading ? (
              <p className="py-4 text-center text-sm text-dark-500">Loading…</p>
            ) : bests.length === 0 ? (
              <p className="py-6 text-center text-sm text-dark-500">
                No records yet.{' '}
                <Link href="/games" className="text-primary-400 hover:text-primary-300">
                  Play a game →
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {bests.map((pb) => {
                  const game = GAMES.find((g) => g.key === pb.gameKey)
                  return (
                    <li
                      key={`${pb.gameKey}-${pb.difficulty ?? 'default'}`}
                      className="flex items-center justify-between rounded-lg bg-dark-800/60 px-4 py-2.5"
                    >
                      <span className="flex items-center gap-2 font-medium text-white">
                        <span>{game?.icon}</span>
                        {getGameConfig(pb.gameKey).name}
                        {pb.difficulty && (
                          <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs uppercase text-violet-300">
                            {pb.difficulty}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm text-primary-400">
                        {formatBest(pb)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Recent history */}
        <Card>
          <CardHeader
            title="📜 Recent Games"
            subtitle="Your last 10 completed games"
            action={
              <Link href="/statistics" className="text-sm text-primary-400 hover:text-primary-300">
                All stats →
              </Link>
            }
          />
          <CardBody>
            {loading ? (
              <p className="py-4 text-center text-sm text-dark-500">Loading…</p>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-sm text-dark-500">No games played yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((s) => {
                  const game = GAMES.find((g) => g.key === s.game.gameKey)
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-dark-800/60 px-4 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2 text-white">
                        <span>{game?.icon}</span>
                        {game?.name}
                        {s.difficulty && (
                          <span className="rounded bg-dark-700 px-1.5 py-0.5 text-xs uppercase text-dark-300">
                            {s.difficulty}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-primary-400">{formatHistory(s)}</span>
                        <span className="text-xs text-dark-500">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}
