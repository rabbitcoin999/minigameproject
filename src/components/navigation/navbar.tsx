'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/features/auth/use-auth'
import { useSound } from '@/lib/sound/sound-context'
import { GAMES } from '@/config/games'

export function Navbar() {
  const { player, loading, logout } = useAuth()
  const { play, muted, setMuted } = useSound()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/games', label: 'Games' },
    { href: '/leaderboard', label: 'Leaderboards' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-dark-800 bg-dark-950/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-2xl">🎮</span>
            <span className="bg-gradient-to-r from-primary-400 to-emerald-300 bg-clip-text text-transparent">
              MiniGames
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 transition hover:bg-dark-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {player && (
              <>
                <Link
                  href="/profile"
                  className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 transition hover:bg-dark-800 hover:text-white"
                >
                  Profile
                </Link>
                <Link
                  href="/statistics"
                  className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 transition hover:bg-dark-800 hover:text-white"
                >
                  Statistics
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={() => setMuted(!muted)}
            className="rounded-md p-2 text-dark-300 transition hover:bg-dark-800 hover:text-white"
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            )}
          </button>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-dark-800" />
          ) : player ? (
            <>
              <span className="text-sm text-dark-300">
                Signed in as{' '}
                <span className="font-semibold text-primary-400">{player.playerId}</span>
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-dark-700 px-3 py-1.5 text-sm font-medium text-dark-200 transition hover:bg-dark-800 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-dark-200 transition hover:bg-dark-800 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-md p-2 text-dark-300 hover:bg-dark-800 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-dark-800 bg-dark-950 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {player && (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-white"
                >
                  Profile
                </Link>
                <Link
                  href="/statistics"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-white"
                >
                  Statistics
                </Link>
              </>
            )}
          </div>
          <div className="mt-3 border-t border-dark-800 pt-3">
            {player ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-300">
                  <span className="font-semibold text-primary-400">{player.playerId}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-dark-700 px-3 py-1.5 text-sm text-dark-200"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-md border border-dark-700 px-3 py-2 text-center text-sm text-dark-200"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-md bg-primary-500 px-3 py-2 text-center text-sm font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
