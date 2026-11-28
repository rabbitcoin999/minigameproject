'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { RunnerViewportHandle } from './runner-viewport'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { useSound } from '@/lib/sound/sound-context'
import { Button } from '@/components/ui/button'

const RunnerViewport = dynamic(
  () => import('./runner-viewport').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-xl border border-dark-700 bg-dark-950 animate-pulse"
        style={{ aspectRatio: '4 / 3' }}
        aria-hidden="true"
      />
    ),
  }
)

type Phase = 'idle' | 'running' | 'paused' | 'over'

export function RunnerGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const viewportRef = useRef<RunnerViewportHandle | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const { play } = useSound()

  // Load personal best
  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=runner')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  const startGame = useCallback(() => {
    setScore(0)
    setSpeed(0)
    setSaveState(null)
    setPhase('running')
    submittedRef.current = false
    startTimeRef.current = Date.now()
    elapsedRef.current = 0
    play('start')
    viewportRef.current?.start()
  }, [play])

  const pauseGame = useCallback(() => {
    if (phase === 'running') {
      viewportRef.current?.pause()
      play('pause')
      setPhase('paused')
    }
  }, [phase, play])

  const resumeGame = useCallback(() => {
    if (phase === 'paused') {
      viewportRef.current?.resume()
      setPhase('running')
    }
  }, [phase])

  const handleScoreChange = useCallback((s: number) => {
    setScore(s)
  }, [])

  const handleSpeedChange = useCallback((s: number) => {
    setSpeed(s)
  }, [])

  const handleGameOver = useCallback(
    (finalScore: number) => {
      play('gameOver')
      setScore(finalScore)
      setPhase('over')
    },
    [play]
  )

  const handleAutoPause = useCallback(() => {
    setPhase('paused')
  }, [])

  // Track elapsed time & submit score on game over
  useEffect(() => {
    if (phase === 'running' && startTimeRef.current === 0) {
      startTimeRef.current = Date.now() - elapsedRef.current
    }
    if (phase !== 'running' && startTimeRef.current > 0) {
      elapsedRef.current = Date.now() - startTimeRef.current
    }

    if (phase === 'over' && !submittedRef.current) {
      submittedRef.current = true
      const durationMs = elapsedRef.current

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'runner',
          score,
          durationMs: Math.round(durationMs),
        }).then((result) => {
          if (result.ok) {
            setSaveState('saved')
            setBest((b) => (b === null || score > b ? score : b))
          } else {
            setSaveState('error')
          }
        })
      } else {
        setSaveState('guest')
        setBest((b) => (b === null || score > b ? score : b))
      }
    }
    if (phase === 'running') {
      submittedRef.current = false
    }
  }, [phase, score, player, submitScore])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (phase !== 'running') return

      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault()
        viewportRef.current?.input('left')
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault()
        viewportRef.current?.input('right')
      } else if (key === ' ' || key === 'spacebar' || key === 'arrowup' || key === 'w') {
        e.preventDefault()
        viewportRef.current?.input('jump')
      } else if (key === 'p' || key === 'escape') {
        e.preventDefault()
        pauseGame()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, pauseGame])

  // Touch controls (swipe + tap)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (phase !== 'running') return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [phase])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (phase !== 'running' || !touchStartRef.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const threshold = 24

      if (absX > absY && absX > threshold) {
        // Horizontal swipe - lane change
        viewportRef.current?.input(dx > 0 ? 'right' : 'left')
      } else if (absY > threshold && dy < 0) {
        // Swipe up - jump
        viewportRef.current?.input('jump')
      } else if (absX < threshold && absY < threshold) {
        // Tap - jump
        viewportRef.current?.input('jump')
      }
      touchStartRef.current = null
    },
    [phase]
  )

  const submittedRef = useRef(false)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🏃 Neon Runner</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best: <span className="font-bold text-primary-400">{best} m</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-dark-800 bg-dark-900 px-5 py-3">
        <span className="text-sm text-dark-400">
          Distance: <span className="text-xl font-bold text-white">{score} m</span>
        </span>
        <span className="text-sm text-dark-400">
          Speed:{' '}
          <span className="font-mono text-xl font-bold text-primary-400">
            {speed.toFixed(1)} m/s
          </span>
        </span>
      </div>

      {/* Viewport */}
      <div
        className="relative mt-4 w-full touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <RunnerViewport
          handleRef={viewportRef}
          onScoreChange={handleScoreChange}
          onSpeedChange={handleSpeedChange}
          onGameOver={handleGameOver}
          onAutoPause={handleAutoPause}
        />

        {/* Overlay */}
        {phase !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/85 backdrop-blur-sm">
            {phase === 'idle' && (
              <>
                <p className="text-xl font-bold text-white">Neon Runner</p>
                <p className="mt-2 max-w-sm text-sm text-dark-400">
                  Dash down an endless neon track — dodge obstacles and jump barriers at full
                  speed. Speed increases the further you go!
                </p>
                <div className="mt-4 text-sm text-dark-500 space-y-1">
                  <p>← / A — Move left</p>
                  <p>→ / D — Move right</p>
                  <p>Space / ↑ / W — Jump</p>
                  <p>P / Esc — Pause</p>
                </div>
                <Button onClick={startGame} size="lg" className="mt-5">
                  Start Game
                </Button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p className="text-xl font-bold text-white">Paused</p>
                <Button onClick={resumeGame} className="mt-4">
                  Resume
                </Button>
              </>
            )}
            {phase === 'over' && (
              <>
                <p className="text-xl font-bold text-red-400">Game Over!</p>
                <p className="mt-2 text-3xl font-bold text-white">{score} m</p>
                {saveState === 'saved' && (
                  <p className="mt-1 text-sm text-primary-400">Score saved ✓</p>
                )}
                {saveState === 'error' && (
                  <p className="mt-1 text-sm text-red-400">Failed to save score</p>
                )}
                {saveState === 'guest' && (
                  <p className="mt-1 text-sm text-dark-400">
                    <Link href="/login" className="text-primary-400 hover:text-primary-300">
                      Log in
                    </Link>{' '}
                    to save your score
                  </p>
                )}
                <Button onClick={startGame} className="mt-5">
                  Play Again
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pause/Restart controls */}
      <div className="mt-4 flex justify-center gap-3">
        {phase === 'running' && (
          <Button variant="secondary" onClick={pauseGame}>
            ⏸ Pause
          </Button>
        )}
        {phase === 'paused' && (
          <Button onClick={resumeGame}>▶ Resume</Button>
        )}
        {(phase === 'running' || phase === 'paused') && (
          <Button variant="danger" onClick={startGame}>
            ↻ Restart
          </Button>
        )}
      </div>

      {/* Mobile on-screen controls */}
      <div className="mx-auto mt-6 grid max-w-48 grid-cols-3 gap-2 sm:hidden">
        <Button
          variant="secondary"
          onClick={() => viewportRef.current?.input('left')}
          disabled={phase !== 'running'}
          aria-label="Move left"
        >
          ◀
        </Button>
        <Button
          variant="secondary"
          onClick={() => viewportRef.current?.input('jump')}
          disabled={phase !== 'running'}
          aria-label="Jump"
        >
          ▲
        </Button>
        <Button
          variant="secondary"
          onClick={() => viewportRef.current?.input('right')}
          disabled={phase !== 'running'}
          aria-label="Move right"
        >
          ▶
        </Button>
      </div>

      <p className="mt-4 text-center text-sm text-dark-500">
        Switch lanes (←/→ or swipe), jump barriers (Space/↑/W or swipe up/tap). Speed ramps up!
      </p>
    </div>
  )
}