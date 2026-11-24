'use client'

import { useEffect, useState } from 'react'
import { GAMES } from '@/config/games'
import { useAuth } from '@/features/auth/use-auth'
import { GameCard } from '@/components/games/game-card'
import { formatLapTime } from '@/features/racing/format'

export default function GamesPage() {
  const { player } = useAuth()
  const [personalBests, setPersonalBests] = useState<Record<string, string>>({})

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
                  : pb.gameKey === 'runner'
                    ? `${pb.score} m`
                    : pb.gameKey === 'racing'
                      ? formatLapTime(pb.score)
                      : `${pb.score} pts`
          }
          setPersonalBests(map)
        }
      })
      .catch(() => {})
  }, [player])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-white">Games</h1>
      <p className="mt-2 text-dark-400">
        Choose a game, set a record, and claim your spot on the leaderboard.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {GAMES.map((game) => (
          <GameCard key={game.key} game={game} personalBest={personalBests[game.key] ?? null} />
        ))}
      </div>
    </div>
  )
}
