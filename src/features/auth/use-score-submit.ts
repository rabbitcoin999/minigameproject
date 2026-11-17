'use client'

import { useState } from 'react'

export interface ScoreSubmissionPayload {
  gameKey: string
  score: number
  completionTime?: number | null
  difficulty?: string | null
  durationMs?: number | null
  sessionToken?: string | null
}

export interface ScoreSubmissionResult {
  ok: boolean
  isNewPersonalBest?: boolean
  previousBest?: number | null
  error?: string
}

export function useScoreSubmit() {
  const [submitting, setSubmitting] = useState(false)

  const submitScore = async (payload: ScoreSubmissionPayload): Promise<ScoreSubmissionResult> => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        return { ok: false, error: json.error ?? 'Failed to save score.' }
      }

      return {
        ok: true,
        isNewPersonalBest: json.data.isNewPersonalBest,
        previousBest: json.data.previousBest,
      }
    } catch {
      return { ok: false, error: 'Network error. Score not saved.' }
    } finally {
      setSubmitting(false)
    }
  }

  return { submitScore, submitting }
}

// Request a server-issued gameplay session token (used by protected games)
export async function requestGameSession(gameKey: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/games/${gameKey}/session`, { method: 'POST' })
    if (!res.ok) return null
    const json = await res.json()
    return json.data.sessionToken
  } catch {
    return null
  }
}
