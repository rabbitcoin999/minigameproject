'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { formatLapTime } from './format'

// The race itself is a self-contained page (public/apex-racing) so it keeps its own
// three.js build. It reports the result with postMessage when the player finishes.
const GAME_SRC = '/apex-racing/index.html?embed=1'

interface FinishMessage {
  source: 'apex-racing'
  type: 'finish'
  bestLapMs: number
  raceTimeMs: number
  laps: number
  rank: number
}

function isFinishMessage(data: unknown): data is FinishMessage {
  const d = data as Partial<FinishMessage> | null
  return (
    !!d &&
    d.source === 'apex-racing' &&
    d.type === 'finish' &&
    Number.isFinite(d.bestLapMs) &&
    Number.isFinite(d.raceTimeMs)
  )
}

type SaveState = 'saving' | 'saved' | 'error' | 'guest' | null

export function RacingGame() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [last, setLast] = useState<FinishMessage | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<SaveState>(null)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()

  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=racing')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  const handleFinish = useCallback(
    (msg: FinishMessage) => {
      const lap = Math.round(msg.bestLapMs)
      setLast(msg)
      if (!player) {
        setSaveState('guest')
        return
      }
      setSaveState('saving')
      submitScore({ gameKey: 'racing', score: lap, durationMs: Math.round(msg.raceTimeMs) }).then((result) => {
        if (result.ok) {
          setSaveState('saved')
          setBest((b) => (b === null || lap < b ? lap : b)) // lower is better
        } else {
          setSaveState('error')
        }
      })
    },
    [player, submitScore]
  )

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only accept results from our own embedded game page.
      if (e.origin !== window.location.origin) return
      if (e.source !== frameRef.current?.contentWindow) return
      if (isFinishMessage(e.data)) handleFinish(e.data)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handleFinish])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🏎️ Apex Racing</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best lap: <span className="font-bold text-primary-400">{formatLapTime(best)}</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-dark-800 bg-dark-950">
        <iframe
          ref={frameRef}
          src={GAME_SRC}
          title="Apex Racing"
          allow="autoplay; fullscreen"
          className="block h-[75vh] min-h-[420px] w-full"
        />
      </div>

      <div className="mt-4 min-h-[1.5rem] text-center text-sm">
        {last && (
          <span className="text-dark-400">
            Last race: best lap <span className="font-bold text-white">{formatLapTime(last.bestLapMs)}</span>
            {' · '}finished P{last.rank}{' · '}
          </span>
        )}
        {saveState === 'saving' && <span className="text-dark-400">Saving…</span>}
        {saveState === 'saved' && <span className="text-primary-400">Score saved ✓</span>}
        {saveState === 'error' && <span className="text-red-400">Failed to save score</span>}
        {saveState === 'guest' && (
          <span className="text-dark-400">
            <Link href="/login" className="text-primary-400 hover:text-primary-300">
              Log in
            </Link>{' '}
            to save your lap time
          </span>
        )}
      </div>

      <p className="mt-2 text-center text-sm text-dark-500">
        Finish a race to submit your best lap — click the game once so it receives keyboard input.
      </p>
    </div>
  )
}
