'use client'

import Link from 'next/link'
import type { GameConfig } from '@/config/games'

interface GameCardProps {
  game: GameConfig
  personalBest?: string | null
}

export function GameCard({ game, personalBest }: GameCardProps) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-dark-800 bg-dark-900 transition hover:border-dark-600 hover:shadow-xl">
      <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${game.gradient}`}>
        <span className="text-5xl drop-shadow-md transition group-hover:scale-110" role="img" aria-label={game.name}>
          {game.icon}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold text-white">{game.name}</h3>
        <p className="mt-1 flex-1 text-sm text-dark-400">{game.description}</p>
        <div className="mt-3 flex items-center justify-between">
          {personalBest ? (
            <span className="text-xs text-dark-400">
              Your best: <span className="font-semibold text-primary-400">{personalBest}</span>
            </span>
          ) : (
            <span className="text-xs text-dark-500">No record yet</span>
          )}
        </div>
        <Link
          href={game.path}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          Play
        </Link>
      </div>
    </div>
  )
}
