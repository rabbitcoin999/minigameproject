'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  move,
  addRandomTile,
  hasValidMoves,
  createInitialState,
  TILE_COLORS,
  GRID_SIZE,
  type Grid,
} from './logic'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { useSound } from '@/lib/sound/sound-context'
import { Button } from '@/components/ui/button'

type Phase = 'playing' | 'over'
interface HistoryEntry {
  grid: Grid
  score: number
}

export function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => createInitialState().grid)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('playing')
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const historyRef = useRef<HistoryEntry[]>([])
  const startTimeRef = useRef<number>(Date.now())
  const maxTileRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const { play } = useSound()

  useEffect(() => {
    maxTileRef.current = Math.max(...grid.flat())
  }, [grid])

  // Load personal best
  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=2048')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  const finishGame = useCallback(
    (finalScore: number) => {
      setPhase('over')
      const durationMs = Date.now() - startTimeRef.current
      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: '2048',
          score: finalScore,
          durationMs: Math.round(durationMs),
        }).then((result) => {
          if (result.ok) {
            setSaveState('saved')
            setBest((b) => (b === null || finalScore > b ? finalScore : b))
          } else {
            setSaveState('error')
          }
        })
      } else {
        setSaveState('guest')
        setBest((b) => (b === null || finalScore > b ? finalScore : b))
      }
    },
    [player, submitScore]
  )

  const handleMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (phase !== 'playing') return

      setGrid((current) => {
        const result = move(current, direction)
        if (!result.moved) return current

        // Save history for undo (max 10 steps)
        historyRef.current = [
          ...historyRef.current.slice(-9),
          { grid: current, score: scoreRef.current },
        ]

        const newGrid = result.grid
        addRandomTile(newGrid)
        const newScore = scoreRef.current + result.scoreGained
        setScore(newScore)

        if (result.scoreGained > 0) play('score')

        if (!hasValidMoves(newGrid)) {
          play('gameOver')
          // Defer to avoid setState-in-render
          setTimeout(() => finishGame(newScore), 50)
        }
        return newGrid
      })
    },
    [phase, finishGame, play]
  )

  const scoreRef = useRef(0)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
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
        handleMove(dirMap[key])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleMove])

  // Touch swipe
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (Math.max(absDx, absDy) < 30) return // too short
    if (absDx > absDy) handleMove(dx > 0 ? 'right' : 'left')
    else handleMove(dy > 0 ? 'down' : 'up')
    touchStartRef.current = null
  }

  const restart = () => {
    const init = createInitialState()
    setGrid(init.grid)
    setScore(0)
    setPhase('playing')
    setSaveState(null)
    historyRef.current = []
    startTimeRef.current = Date.now()
  }

  const canUndo = historyRef.current.length > 0 && phase === 'playing'

  const undo = () => {
    const prev = historyRef.current.pop()
    if (!prev) return
    setGrid(prev.grid)
    setScore(prev.score)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🔢 2048</h1>
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
          Score: <span className="text-xl font-bold text-white">{score}</span>
        </span>
        <span className="text-sm text-dark-400">
          Top tile: <span className="font-bold text-amber-400">{maxTileRef.current || 2}</span>
        </span>
      </div>

      {/* Board */}
      <div
        className="relative mt-4 aspect-square w-full touch-none select-none rounded-xl border border-dark-700 bg-dark-950 p-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="grid h-full w-full gap-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((value, c) => {
              const colors = TILE_COLORS[value] ?? { bg: '#8b5cf6', fg: '#ffffff' }
              return (
                <div
                  key={`${r}-${c}`}
                  className="flex items-center justify-center rounded-md font-bold transition-all duration-100"
                  style={{
                    backgroundColor: value === 0 ? '#1a1f2e' : colors.bg,
                    color: value === 0 ? 'transparent' : colors.fg,
                    fontSize: value >= 1024 ? '1.1rem' : value >= 128 ? '1.4rem' : '1.7rem',
                  }}
                >
                  {value === 0 ? '' : value}
                </div>
              )
            })
          )}
        </div>

        {/* Game over overlay */}
        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/85 backdrop-blur-sm">
            <p className="text-xl font-bold text-red-400">No moves left!</p>
            <p className="mt-2 text-3xl font-bold text-white">{score} pts</p>
            <p className="mt-1 text-sm text-dark-400">Top tile: {maxTileRef.current}</p>
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
            <Button onClick={restart} className="mt-5">
              Play Again
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex justify-center gap-3">
        <Button variant="secondary" onClick={undo} disabled={!canUndo}>
          ↶ Undo
        </Button>
        <Button variant="danger" onClick={restart}>
          ↻ Restart
        </Button>
      </div>

      <p className="mt-4 text-center text-sm text-dark-500">
        Arrow keys / WASD or swipe to move. Merge identical tiles to reach 2048!
      </p>
    </div>
  )
}
