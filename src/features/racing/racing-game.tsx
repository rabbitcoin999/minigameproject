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

interface BestMessage {
  source: 'apex-racing'
  type: 'best'
  bestLapMs: number
}

function isBestMessage(data: unknown): data is BestMessage {
  const d = data as Partial<BestMessage> | null
  return !!d && d.source === 'apex-racing' && d.type === 'best' && Number.isFinite(d.bestLapMs)
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
  const stageRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [pseudoFull, setPseudoFull] = useState(false) // fallback where the Fullscreen API is missing (iPhone)
  const [localBest, setLocalBest] = useState<number | null>(null) // best lap stored by the game itself
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

  const sayHello = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'apex-hello' }, window.location.origin)
  }, [])

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
      if (isBestMessage(e.data)) {
        const lap = Math.round(e.data.bestLapMs)
        setLocalBest((b) => (b === null || lap < b ? lap : b))
      } else if (isFinishMessage(e.data)) handleFinish(e.data)
    }
    window.addEventListener('message', onMessage)
    // The iframe may have announced its stored best before this listener existed: ask again.
    sayHello()
    return () => window.removeEventListener('message', onMessage)
  }, [handleFinish, sayHello])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!pseudoFull) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPseudoFull(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [pseudoFull])

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current
    if (!stage) return
    if (pseudoFull) {
      setPseudoFull(false)
      return
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (stage.requestFullscreen) {
      try {
        await stage.requestFullscreen()
        frameRef.current?.focus()
        return
      } catch {
        /* fall through to the in-page fullscreen */
      }
    }
    setPseudoFull(true)
  }, [pseudoFull])

  // Best lap shown in the header: the better of the saved (server) and the game's own record.
  const shownBest = best !== null && localBest !== null ? Math.min(best, localBest) : best ?? localBest

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🏎️ Apex Racing</h1>
        <div className="text-right text-sm">
          {shownBest !== null ? (
            <span className="text-dark-400">
              Best lap: <span className="font-bold text-primary-400">{formatLapTime(shownBest)}</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border border-dark-700 px-3 py-1.5 text-sm text-dark-300 hover:border-dark-500 hover:text-white"
        >
          ⛶ Full screen
        </button>
      </div>

      <div
        ref={stageRef}
        className={
          pseudoFull
            ? 'fixed inset-0 z-50 bg-dark-950'
            : 'mt-2 overflow-hidden rounded-xl border border-dark-800 bg-dark-950'
        }
      >
        <iframe
          ref={frameRef}
          src={GAME_SRC}
          title="Apex Racing"
          allow="autoplay; fullscreen"
          allowFullScreen
          onLoad={sayHello}
          className={fullscreen || pseudoFull ? 'block h-full w-full' : 'block h-[75vh] min-h-[420px] w-full'}
        />
        {pseudoFull && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-dark-900/80 px-4 py-1.5 text-xs text-white backdrop-blur"
          >
            ✕ Exit full screen
          </button>
        )}
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
