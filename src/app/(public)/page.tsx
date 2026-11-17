'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GAMES } from '@/config/games'
import { useAuth } from '@/features/auth/use-auth'
import { GameCard } from '@/components/games/game-card'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

interface LeaderboardRow {
  rank: number
  playerId: string
  score: number
}

export default function HomePage() {
  const { player } = useAuth()
  const [topPlayers, setTopPlayers] = useState<LeaderboardRow[]>([])
  const [personalBests, setPersonalBests] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load snake leaderboard for "Top Players" section
    fetch('/api/leaderboard/snake?page=1&pageSize=5')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.entries) setTopPlayers(json.data.entries)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!player) return
    fetch('/api/scores/personal-best')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBests) {
          const map: Record<string, string> = {}
          for (const pb of json.data.personalBests) {
            map[pb.gameKey] =
              pb.gameKey === 'memory'
                ? `${(pb.completionTime / 1000).toFixed(1)}s (${pb.difficulty})`
                : pb.gameKey === 'reaction'
                  ? `${pb.score} ms`
                  : `${pb.score} pts`
          }
          setPersonalBests(map)
        }
      })
      .catch(() => {})
  }, [player])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="animate-fade-in rounded-2xl border border-dark-800 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800 px-6 py-14 text-center sm:px-12">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Play. Compete.{' '}
          <span className="bg-gradient-to-r from-primary-400 to-emerald-300 bg-clip-text text-transparent">
            Climb the boards.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-dark-400">
          Five classic mini games, one account, global leaderboards. Your Player ID is all you need —
          no email required.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/games"
            className="rounded-lg bg-primary-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-600"
          >
            Browse Games
          </Link>
          {!player && (
            <Link
              href="/register"
              className="rounded-lg border border-dark-700 bg-dark-800 px-6 py-3 text-base font-semibold text-white transition hover:bg-dark-700"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </section>

      {/* Featured games */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold text-white">All Games</h2>
          <Link href="/games" className="text-sm font-medium text-primary-400 hover:text-primary-300">
            View all →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {GAMES.map((game) => (
            <GameCard key={game.key} game={game} personalBest={personalBests[game.key] ?? null} />
          ))}
        </div>
      </section>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top players */}
        <Card>
          <CardHeader
            title="🏆 Top Players"
            subtitle="Current leaders in Snake"
            action={
              <Link href="/leaderboard" className="text-sm text-primary-400 hover:text-primary-300">
                All boards →
              </Link>
            }
          />
          <CardBody>
            {topPlayers.length === 0 ? (
              <p className="py-6 text-center text-sm text-dark-500">
                No scores yet. Be the first on the board!
              </p>
            ) : (
              <ol className="space-y-2">
                {topPlayers.map((row) => (
                  <li
                    key={row.rank}
                    className="flex items-center justify-between rounded-lg bg-dark-800/60 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          row.rank === 1
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : row.rank === 2
                              ? 'bg-gray-400/20 text-gray-300'
                              : row.rank === 3
                                ? 'bg-amber-600/20 text-amber-500'
                                : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        {row.rank}
                      </span>
                      <span className="font-medium text-white">{row.playerId}</span>
                    </div>
                    <span className="font-mono text-sm text-primary-400">{row.score} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        {/* Personal bests / call to action */}
        <Card>
          <CardHeader
            title={player ? '🎯 Your Records' : '🔒 Your Progress Awaits'}
            subtitle={
              player ? 'Personal bests across all games' : 'Log in to save your scores'
            }
          />
          <CardBody>
            {player ? (
              Object.keys(personalBests).length === 0 ? (
                <p className="py-6 text-center text-sm text-dark-500">
                  Play a game to set your first record!
                </p>
              ) : (
                <ul className="space-y-2">
                  {GAMES.filter((g) => personalBests[g.key]).map((g) => (
                    <li
                      key={g.key}
                      className="flex items-center justify-between rounded-lg bg-dark-800/60 px-4 py-2.5"
                    >
                      <Link href={g.path} className="flex items-center gap-2 font-medium text-white hover:text-primary-300">
                        <span>{g.icon}</span> {g.name}
                      </Link>
                      <span className="font-mono text-sm text-primary-400">
                        {personalBests[g.key]}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-dark-400">
                  Register with just a Player ID and password to track scores, earn records, and
                  appear on the leaderboards.
                </p>
                <Link
                  href="/register"
                  className="mt-4 inline-block rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
                >
                  Get Started
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
