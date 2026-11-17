import Link from 'next/link'
import { GAMES } from '@/config/games'

export function Footer() {
  return (
    <footer className="border-t border-dark-800 bg-dark-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-2xl">🎮</span>
              <span className="bg-gradient-to-r from-primary-400 to-emerald-300 bg-clip-text text-transparent">
                MiniGames
              </span>
            </div>
            <p className="mt-3 text-sm text-dark-400">
              Play classic mini games, track your records, and climb the global leaderboards.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-dark-300">Games</h3>
            <ul className="mt-3 space-y-2">
              {GAMES.map((game) => (
                <li key={game.key}>
                  <Link href={game.path} className="text-sm text-dark-400 hover:text-white">
                    {game.icon} {game.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-dark-300">Platform</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/games" className="text-sm text-dark-400 hover:text-white">All Games</Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-sm text-dark-400 hover:text-white">Leaderboards</Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-dark-400 hover:text-white">Create Account</Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-dark-400 hover:text-white">Log In</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-dark-800 pt-6 text-center text-xs text-dark-500">
          © {new Date().getFullYear()} MiniGames Platform. Built for players.
        </div>
      </div>
    </footer>
  )
}
