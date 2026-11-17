'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  createInitialState,
  tick,
  nextDirection,
  GRID_SIZE,
  TICK_MS,
  type SnakeState,
  type Direction,
} from './logic'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { Button } from '@/components/ui/button'

type GamePhase = 'idle' | 'running' | 'paused' | 'over'

export function SnakeGame() {
  const [state, setState] = useState<SnakeState>(createInitialState)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const directionRef = useRef<Direction>('right')
  const pendingDirRef = useRef<Direction>('right')
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()

  // Load personal best
  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=snake')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const dirMap: Record<string, Direction> = {
        arrowup: 'up',
        w: 'up',
        arrowdown: 'down',
        s: 'down',
        arrowleft: 'left',
        a: 'left',
        arrowright: 'right',
        d: 'right',
      }
      if (key in dirMap) {
        e.preventDefault()
        pendingDirRef.current = nextDirection(directionRef.current, dirMap[key])
      }
      // Space toggles pause / start
      if (key === ' ' || key === 'spacebar') {
        e.preventDefault()
        setPhase((p) => {
          if (p === 'running') return 'paused'
          if (p === 'paused') return 'running'
          if (p === 'idle') return 'running'
          return p
        })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Game loop
  useEffect(() => {
    if (phase !== 'running') return
    const interval = setInterval(() => {
      setState((s) => {
        if (s.gameOver) return s
        directionRef.current = pendingDirRef.current
        const next = tick({ ...s, direction: directionRef.current })
        if (next.gameOver) {
          setPhase('over')
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [phase])

  // Track elapsed time & submit score on game over
  useEffect(() => {
    if (phase === 'running' && startTimeRef.current === 0) {
      startTimeRef.current = Date.now() - elapsedRef.current
    }
    if (phase !== 'running' && startTimeRef.current > 0) {
      elapsedRef.current = Date.now() - startTimeRef.current
    }

    if (phase === 'over' && state.gameOver) {
      const durationMs = elapsedRef.current
      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'snake',
          score: state.score,
          durationMs: Math.round(durationMs),
        }).then((result) => {
          if (result.ok) {
            setSaveState('saved')
            setBest((b) => (b === null || state.score > b ? state.score : b))
          } else {
            setSaveState('error')
          }
        })
      } else {
        setSaveState('guest')
        setBest((b) => (b === null || state.score > b ? state.score : b))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state.gameOver])

  const startGame = useCallback(() => {
    setState(createInitialState())
    directionRef.current = 'right'
    pendingDirRef.current = 'right'
    startTimeRef.current = 0
    elapsedRef.current = 0
    setSaveState(null)
    setPhase('running')
  }, [])

  const togglePause = () => {
    if (phase === 'running') setPhase('paused')
    else if (phase === 'paused') setPhase('running')
  }

  const cellSize = 100 / GRID_SIZE

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🐍 Snake</h1>
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

      {/* Score bar */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-dark-800 bg-dark-900 px-5 py-3">
        <span className="text-sm text-dark-400">
          Score: <span className="text-xl font-bold text-white">{state.score}</span>
        </span>
        <span className="text-sm text-dark-400">Length: {state.snake.length}</span>
      </div>

      {/* Board */}
      <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-xl border border-dark-700 bg-dark-950">
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
          }}
        />
        {/* Food */}
        <div
          className="absolute rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
          style={{
            left: `${state.food.x * cellSize}%`,
            top: `${state.food.y * cellSize}%`,
            width: `${cellSize}%`,
            height: `${cellSize}%`,
            transform: 'scale(0.7)',
          }}
        />
        {/* Snake */}
        {state.snake.map((seg, i) => (
          <div
            key={`${seg.x}-${seg.y}-${i}`}
            className="absolute rounded-sm"
            style={{
              left: `${seg.x * cellSize}%`,
              top: `${seg.y * cellSize}%`,
              width: `${cellSize}%`,
              height: `${cellSize}%`,
              backgroundColor: i === 0 ? '#4ade80' : '#22c55e',
              opacity: 1 - (i / state.snake.length) * 0.4,
              borderRadius: i === 0 ? '30%' : '15%',
            }}
          />
        ))}

        {/* Overlay */}
        {phase !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-950/85 backdrop-blur-sm">
            {phase === 'idle' && (
              <>
                <p className="text-xl font-bold text-white">Ready to play?</p>
                <p className="mt-2 text-sm text-dark-400">
                  Arrow keys or WASD to move · Space to pause
                </p>
                <Button onClick={startGame} size="lg" className="mt-5">
                  Start Game
                </Button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p className="text-xl font-bold text-white">Paused</p>
                <Button onClick={togglePause} className="mt-4">
                  Resume
                </Button>
              </>
            )}
            {phase === 'over' && (
              <>
                <p className="text-xl font-bold text-red-400">Game Over!</p>
                <p className="mt-2 text-3xl font-bold text-white">{state.score} pts</p>
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

      {/* Controls */}
      <div className="mt-4 flex justify-center gap-3">
        {phase === 'running' && (
          <Button variant="secondary" onClick={togglePause}>
            ⏸ Pause
          </Button>
        )}
        {phase === 'paused' && (
          <Button onClick={togglePause}>▶ Resume</Button>
        )}
        {(phase === 'running' || phase === 'paused') && (
          <Button variant="danger" onClick={startGame}>
            ↻ Restart
          </Button>
        )}
      </div>

      {/* Mobile touch controls */}
      <div className="mx-auto mt-6 grid max-w-48 grid-cols-3 gap-2 sm:hidden">
        <div />
        <TouchButton label="▲" onPress={() => {
          pendingDirRef.current = nextDirection(directionRef.current, 'up')
        }} />
        <div />
        <TouchButton label="◀" onPress={() => {
          pendingDirRef.current = nextDirection(directionRef.current, 'left')
        }} />
        <TouchButton label="▼" onPress={() => {
          pendingDirRef.current = nextDirection(directionRef.current, 'down')
        }} />
        <TouchButton label="▶" onPress={() => {
          pendingDirRef.current = nextDirection(directionRef.current, 'right')
        }} />
      </div>
    </div>
  )
}

function TouchButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      className="flex h-14 items-center justify-center rounded-lg border border-dark-700 bg-dark-800 text-xl text-white active:bg-dark-700"
      onClick={onPress}
      aria-label={`Move ${label}`}
    >
      {label}
    </button>
  )
}
