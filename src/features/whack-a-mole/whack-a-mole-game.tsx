'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  GAME_DURATION_MS,
  GRID_COLS,
  GRID_ROWS,
  NORMAL_POINTS,
  BONUS_POINTS,
  difficultyAt,
  spawnMole,
  pruneMoles,
  type ActiveMole,
} from './logic'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { useSound } from '@/lib/sound/sound-context'
import { Button } from '@/components/ui/button'

type Phase = 'idle' | 'playing' | 'over'

export function WhackAMoleGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [timeLeftMs, setTimeLeftMs] = useState(GAME_DURATION_MS)
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const [activeMoles, setActiveMoles] = useState<ActiveMole[]>([])
  const [flash, setFlash] = useState<{ cell: number; hit: boolean } | null>(null)

  const startRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextSpawnGapRef = useRef<number>(700)
  const lastDifficultyCheckRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const { play } = useSound()

  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=whack-a-mole')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (spawnRef.current) clearInterval(spawnRef.current)
    timerRef.current = null
    spawnRef.current = null
  }, [])

  useEffect(() => stopAll, [stopAll])

  const startGame = useCallback(() => {
    setScore(0)
    setTimeLeftMs(GAME_DURATION_MS)
    setActiveMoles([])
    setFlash(null)
    setSaveState(null)
    setPhase('playing')
    submittedRef.current = false
    startRef.current = Date.now()
    nextSpawnGapRef.current = 700
    lastDifficultyCheckRef.current = 0
    play('start')

    // Timer countdown
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, GAME_DURATION_MS - elapsed)
      setTimeLeftMs(remaining)
      if (remaining <= 0) {
        stopAll()
        play('gameOver')
        setPhase('over')
      }
    }, 50)

    // Mole spawner
    const trySpawn = () => {
      const now = Date.now()
      const elapsed = now - startRef.current
      const { upDurationMs, spawnGapMs } = difficultyAt(elapsed)
      nextSpawnGapRef.current = spawnGapMs

      setActiveMoles((current) => {
        const pruned = pruneMoles(current, now)
        const mole = spawnMole(now, upDurationMs, pruned)
        if (mole) return [...pruned, mole]
        return pruned
      })

      // Schedule next spawn
      if (spawnRef.current) clearInterval(spawnRef.current)
      spawnRef.current = setInterval(trySpawn, nextSpawnGapRef.current)
    }

    // Start spawning
    trySpawn()
  }, [stopAll])

  const hitMole = useCallback(
    (cell: number) => {
      if (phase !== 'playing') return

      setActiveMoles((current) => {
        const moleIdx = current.findIndex((m) => m.cell === cell)
        if (moleIdx === -1) return current

        const mole = current[moleIdx]
        const points = mole.isBonus ? BONUS_POINTS : NORMAL_POINTS
        setScore((s) => s + points)
        play('score')
        if (mole.isBonus) play('combo')
        setFlash({ cell, hit: true })

        // Remove this mole
        const next = [...current]
        next.splice(moleIdx, 1)
        return next
      })

      // Clear flash
      setTimeout(() => setFlash(null), 120)
    },
    [phase, play]
  )

  const missMole = useCallback(
    (cell: number) => {
      if (phase !== 'playing') return
      setFlash({ cell, hit: false })
      setTimeout(() => setFlash(null), 120)
    },
    [phase]
  )

  // Game-over detection with a ref guard. When the countdown hits zero the
  // interval calls setPhase('over') directly; this effect only exists to
  // capture the final score synchronously before any re-render can drop it.
  // The submittedRef guard guarantees exactly one submission per game.
  const submittedRef = useRef(false)

  useEffect(() => {
    if (phase === 'over' && !submittedRef.current) {
      submittedRef.current = true
      const durationMs = GAME_DURATION_MS

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'whack-a-mole',
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
    if (phase === 'playing') {
      submittedRef.current = false
    }
  }, [phase, score, player, submitScore])

  const remainingSeconds = Math.ceil(timeLeftMs / 1000)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🔨 Whack-a-Mole</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best: <span className="font-bold text-primary-400">{best}</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-dark-800 bg-dark-900 px-5 py-3">
        <span className="text-sm text-dark-400">
          Score: <span className="text-xl font-bold text-white">{score}</span>
        </span>
        <span className="text-sm text-dark-400">
          Time:{' '}
          <span className="font-mono text-xl font-bold text-red-400">
            {remainingSeconds}s
          </span>
        </span>
      </div>

      {/* Grid */}
      <div className="relative mt-4 aspect-square w-full touch-none select-none rounded-xl border border-dark-700 bg-dark-950 p-2">
        <div
          className="grid h-full w-full gap-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
            const mole = activeMoles.find((m) => m.cell === i)
            const isFlashHit = flash?.cell === i && flash.hit
            const isFlashMiss = flash?.cell === i && !flash.hit

            return (
              <button
                key={i}
                onClick={() => hitMole(i)}
                onMouseDown={() => missMole(i)}
                disabled={phase !== 'playing'}
                className="relative flex items-center justify-center rounded-lg border transition-all duration-50"
                style={{
                  borderColor: isFlashHit
                    ? '#22c55e'
                    : isFlashMiss
                      ? '#ef4444'
                      : '#334155',
                  backgroundColor: isFlashHit
                    ? 'rgba(34,197,94,0.15)'
                    : isFlashMiss
                      ? 'rgba(239,68,68,0.15)'
                      : 'transparent',
                  transform: mole ? 'scale(1)' : 'scale(0.95)',
                }}
                aria-label={mole ? (mole.isBonus ? 'Golden mole!' : 'Mole!') : 'Empty hole'}
              >
                {mole && (
                  <span
                    className={`text-4xl sm:text-6xl drop-shadow-lg ${
                      mole.isBonus
                        ? 'text-amber-300 animate-bounce'
                        : 'text-gray-300'
                    }`}
                  >
                    {mole.isBonus ? '✨🦔' : '🦔'}
                  </span>
                )}
                {mole && mole.isBonus && (
                  <span className="absolute -top-2 -right-2 text-xs bg-amber-500 text-black px-1 rounded">
                    +3
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Overlay */}
        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/85 backdrop-blur-sm">
            {phase === 'idle' && (
              <>
                <p className="text-xl font-bold text-white">Bop the moles!</p>
                <p className="mt-2 max-w-sm text-sm text-dark-400">
                  Click/tap moles as they appear. Gold moles = +3 points. Game lasts 30
                  seconds. Speed increases over time!
                </p>
                <Button onClick={startGame} size="lg" className="mt-5">
                  Start Game
                </Button>
              </>
            )}
            {phase === 'over' && (
              <>
                <p className="text-xl font-bold text-red-400">Time&apos;s up!</p>
                <p className="mt-2 text-3xl font-bold text-white">{score} pts</p>
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

      <p className="mt-4 text-center text-sm text-dark-500">
        30 seconds · Normal moles +1 · Gold moles +3 · Speed increases over time
      </p>
    </div>
  )
}