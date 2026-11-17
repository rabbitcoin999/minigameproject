'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { useAuth } from '@/features/auth/use-auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { player, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-primary-400" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="rounded-xl border border-dark-800 bg-dark-900 p-10">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold text-white">Login required</h1>
          <p className="mt-2 text-sm text-dark-400">
            You need to be logged in to view this page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-dark-700 px-5 py-2.5 text-sm font-semibold text-dark-200 transition hover:bg-dark-800"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
