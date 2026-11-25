'use client'

import { useEffect, useState, useCallback } from 'react'
import { GAMES, getGameConfig } from '@/config/games'
import { useAuth } from '@/features/auth/use-auth'
import type { Difficulty, GameKey } from '@/types/game'
import { formatLapTime } from '@/features/racing/format'

interface Entry {
  rank: number
  playerId: string
  score: number
  completionTime: number | null
  difficulty: string | null
  achievedAt: string
}

interface MyRank {
  rank: number | null
  score: number | null
  totalPlayers: number
}

// Gold / silver / bronze shine sweep (styles live in globals.css)
const SHINE_CLASS: Record<number, string> = {
  1: 'shine shine-gold',
  2: 'shine shine-silver',
  3: 'shine shine-bronze',
}

export default function LeaderboardPage() {
  const { player } = useAuth()
  const [selectedGame, setSelectedGame] = useState<GameKey>('snake')
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [myRank, setMyRank] = useState<MyRank | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)

  const game = getGameConfig(selectedGame)

  // Reset page & difficulty when switching games
  useEffect(() => {
    setPage(1)
    setDifficulty(game.hasDifficulty ? 'easy' : null)
  }, [selectedGame]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' })
      if (difficulty) params.set('difficulty', difficulty)

      const res = await fetch(`/api/leaderboard/${selectedGame}?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEntries(json.data.entries)
        setHasMore(json.data.hasMore)
      } else {
        setEntries([])
        setHasMore(false)
      }

      if (player) {
        const meParams = new URLSearchParams()
        if (difficulty) meParams.set('difficulty', difficulty)
        const meRes = await fetch(`/api/leaderboard/${selectedGame}/me?${meParams}`)
        if (meRes.ok) {
          const meJson = await meRes.json()
          setMyRank({
            rank: meJson.data.rank,
            score: meJson.data.score,
            totalPlayers: meJson.data.totalPlayers,
          })
        } else {
          setMyRank(null)
        }
      } else {
        setMyRank(null)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedGame, difficulty, page, player])

  useEffect(() => {
    void load()
  }, [load])

  const formatScore = (entry: Entry): string => {
    if (game.key === 'memory' && entry.completionTime !== null) {
      return `${(entry.completionTime / 1000).toFixed(2)}s`
    }
    if (game.key === 'reaction') {
      return `${entry.score} ms`
    }
    if (game.key === 'racing') {
      return formatLapTime(entry.score)
    }
    if (game.key === 'runner') {
      return `${entry.score} m`
    }
    if (game.key === 'brick-blast') {
      return `${entry.score} pts`
    }
    return `${entry.score} pts`
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-white">Leaderboards</h1>
      <p className="mt-2 text-dark-400">Global Top 100 across all games.</p>

      {/* Game tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => setSelectedGame(g.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              selectedGame === g.key
                ? 'bg-primary-500 text-white'
                : 'border border-dark-700 bg-dark-900 text-dark-300 hover:bg-dark-800'
            }`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* Difficulty tabs (memory only) */}
      {game.hasDifficulty && (
        <div className="mt-4 flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                difficulty === d
                  ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50'
                  : 'text-dark-400 hover:bg-dark-800'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {/* My rank banner */}
      {player && myRank && myRank.rank !== null && (
        <div className="mt-5 rounded-xl border border-primary-500/30 bg-primary-500/10 px-5 py-3">
          <span className="text-sm text-dark-200">
            Your rank:{' '}
            <span className="font-bold text-primary-400">#{myRank.rank}</span>{' '}
            <span className="text-dark-400">
              of {myRank.totalPlayers} — best {formatScore({
                rank: myRank.rank,
                playerId: player.playerId,
                score: myRank.score ?? 0,
                completionTime: null,
                difficulty: null,
                achievedAt: '',
              })}
            </span>
          </span>
        </div>
      )}
      {player && myRank && myRank.rank === null && (
        <div className="mt-5 rounded-xl border border-dark-700 bg-dark-900 px-5 py-3 text-sm text-dark-400">
          You have no score on this board yet. Play the game to appear here!
        </div>
      )}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-dark-800 bg-dark-900">
        <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 border-b border-dark-800 bg-dark-800/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-dark-400 sm:grid-cols-[4rem_1fr_auto_auto]">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">{game.scoreLabel}</span>
          <span className="hidden text-right sm:block">Date</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-400" />
          </div>
        ) : entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-dark-500">
            No scores on this board yet. Play to be the first!
          </p>
        ) : (
          <ol>
            {entries.map((entry, index) => (
              <li
                key={entry.rank}
                // Rows fade in one after another; the delay is capped so a long
                // page (25 rows) never makes the player wait.
                style={
                  {
                    animationDelay: `${Math.min(index * 40, 600)}ms`,
                    '--shine-delay': `${0.8 + entry.rank * 0.7}s`,
                  } as React.CSSProperties
                }
                className={`animate-row-in grid grid-cols-[3rem_1fr_auto] items-center gap-2 border-b border-dark-800/50 px-4 py-3 sm:grid-cols-[4rem_1fr_auto_auto] ${
                  entry.rank <= 3 ? 'bg-dark-800/30' : ''
                } ${SHINE_CLASS[entry.rank] ?? ''} ${player?.playerId.toLowerCase() === entry.playerId.toLowerCase() ? 'ring-1 ring-inset ring-primary-500/40' : ''}`}
              >
                <span className="flex items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      entry.rank === 1
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : entry.rank === 2
                          ? 'bg-gray-400/20 text-gray-300'
                          : entry.rank === 3
                            ? 'bg-amber-600/20 text-amber-500'
                            : 'text-dark-400'
                    }`}
                  >
                    {entry.rank}
                  </span>
                </span>
                <span className="truncate font-medium text-white">{entry.playerId}</span>
                <span className="text-right font-mono text-sm text-primary-400">
                  {formatScore(entry)}
                </span>
                <span className="hidden text-right text-xs text-dark-500 sm:block">
                  {new Date(entry.achievedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-md border border-dark-700 px-3 py-1.5 text-sm text-dark-300 transition hover:bg-dark-800 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-sm text-dark-400">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
            className="rounded-md border border-dark-700 px-3 py-1.5 text-sm text-dark-300 transition hover:bg-dark-800 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
