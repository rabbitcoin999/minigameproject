'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/use-auth'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [playerId, setPlayerId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { refresh } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Login failed.')
        return
      }

      await refresh()
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-dark-800 bg-dark-900 p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-dark-400">
          Log in with your Player ID and password.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="playerId" className="label">
              Player ID
            </label>
            <input
              id="playerId"
              type="text"
              autoComplete="username"
              required
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="input"
              placeholder="e.g. snake_master"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log In'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-dark-400">
          No account yet?{' '}
          <Link href="/register" className="font-semibold text-primary-400 hover:text-primary-300">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
