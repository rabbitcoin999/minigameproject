'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/use-auth'
import { Button } from '@/components/ui/button'

function validatePlayerId(value: string): string | null {
  if (value.length < 3) return 'Player ID must be at least 3 characters.'
  if (value.length > 20) return 'Player ID must be at most 20 characters.'
  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return 'Player ID can only contain letters, numbers, and underscores.'
  return null
}

function validatePassword(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters.'
  return null
}

export default function RegisterPage() {
  const [playerId, setPlayerId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { refresh } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation (server validates again)
    const errors: Record<string, string> = {}
    const idErr = validatePlayerId(playerId)
    if (idErr) errors.playerId = idErr
    const pwErr = validatePassword(password)
    if (pwErr) errors.password = pwErr
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, password, confirmPassword }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Registration failed.')
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
        <h1 className="text-center text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-center text-sm text-dark-400">
          Just a Player ID and password — no email needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
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
              placeholder="3–20 chars: letters, numbers, _"
            />
            {fieldErrors.playerId && <p className="form-error">{fieldErrors.playerId}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
            />
            {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Repeat your password"
            />
            {fieldErrors.confirmPassword && (
              <p className="form-error">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-dark-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary-400 hover:text-primary-300">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  )
}
