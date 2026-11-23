'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  createInitialState,
  createLevelBricks,
  tick,
  launchBall,
  updatePaddle,
  nextLevel,
  restartGame,
  isBallLaunched,
  getGameBounds,
} from './physics.ts'
import type { BrickBlastState, GamePhase } from './types'
// Constants imported but not all used in the component - keep for reference
import { GAME_WIDTH, GAME_HEIGHT } from './constants.ts'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { Button } from '@/components/ui/button'

type Phase = GamePhase

export function BrickBlastGame() {
  const [state, setState] = useState<BrickBlastState | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const [showControls, setShowControls] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const renderRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const submittedRef = useRef(false)

  // Initialize canvas and game state
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas size
    const resize = () => {
      const container = canvas.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height * 0.75 // 4:3 aspect ratio

      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      // Recreate state with new dimensions
      setState(prev => {
        const newState = createInitialState(width, height)
        newState.bricks = createLevelBricks(newState, 1)
        return newState
      })
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Load personal best
  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=brick-blast')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  // Game loop
  useEffect(() => {
    if (!state) return
    if (phase !== 'playing') return

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 1/30) // Cap at 30fps min
      lastTimeRef.current = timestamp

      setState(prev => {
        if (!prev) return prev
        const next = tick(prev, dt)

        // Check for phase changes
        if (next.phase !== prev.phase) {
          setPhase(next.phase)
        }

        return next
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [phase, state])

  // Render loop - draw to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const { canvasWidth, canvasHeight, gameWidth, gameHeight } = state
      const bounds = getGameBounds(state)

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Draw background
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Draw game area border
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)

      // Draw bricks
      for (const brick of state.bricks) {
        const brickRect = {
          x: brick.position.x - brick.width / 2,
          y: brick.position.y - brick.height / 2,
          width: brick.width,
          height: brick.height,
        }

        // Brick background
        const hitRatio = brick.maxHits > 0 ? (brick.maxHits - brick.hitsRemaining) / brick.maxHits : 0
        const alpha = brick.type === 'unbreakable' ? 0.5 : 1 - hitRatio * 0.3

        ctx.fillStyle = brick.color
        ctx.globalAlpha = alpha

        // Rounded rect for bricks
        const radius = 4
        ctx.beginPath()
        ctx.roundRect(brickRect.x, brickRect.y, brickRect.width, brickRect.height, radius)
        ctx.fill()

        // Highlight for special bricks
        if (brick.type === 'explosive') {
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (brick.type === 'multiplier') {
          ctx.strokeStyle = '#8b5cf6'
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (brick.type === 'unbreakable') {
          ctx.strokeStyle = '#64748b'
          ctx.lineWidth = 3
          ctx.stroke()
        }

        ctx.globalAlpha = 1
      }

      // Draw particles
      for (const particle of state.particles) {
        const lifeRatio = particle.life / particle.maxLife
        ctx.globalAlpha = lifeRatio
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.position.x, particle.position.y, particle.size * lifeRatio, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Draw paddle
      const paddleRect = {
        x: state.paddle.position.x - state.paddle.width / 2,
        y: state.paddle.position.y - state.paddle.height / 2,
        width: state.paddle.width,
        height: state.paddle.height,
      }

      // Paddle glow
      const gradient = ctx.createLinearGradient(
        paddleRect.x, paddleRect.y,
        paddleRect.x, paddleRect.y + paddleRect.height
      )
      gradient.addColorStop(0, '#22d3ee')
      gradient.addColorStop(1, '#06b6d4')
      ctx.fillStyle = gradient
      ctx.shadowColor = '#06b6d4'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.roundRect(paddleRect.x, paddleRect.y, paddleRect.width, paddleRect.height, 8)
      ctx.fill()
      ctx.shadowBlur = 0

      // Draw ball
      if (state.ball.launched || state.phase === 'idle') {
        const ballGradient = ctx.createRadialGradient(
          state.ball.position.x - 2, state.ball.position.y - 2, 0,
          state.ball.position.x, state.ball.position.y, state.ball.radius
        )
        ballGradient.addColorStop(0, '#fde047')
        ballGradient.addColorStop(0.5, '#fbbf24')
        ballGradient.addColorStop(1, '#f59e0b')

        ctx.fillStyle = ballGradient
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.arc(state.ball.position.x, state.ball.position.y, state.ball.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      renderRef.current = requestAnimationFrame(render)
    }

    renderRef.current = requestAnimationFrame(render)

    return () => {
      if (renderRef.current) cancelAnimationFrame(renderRef.current)
    }
  }, [state])

  // Track elapsed time & submit score on game over
  useEffect(() => {
    if (phase === 'playing' && startTimeRef.current === 0) {
      startTimeRef.current = Date.now() - elapsedRef.current
    }
    if (phase !== 'playing' && startTimeRef.current > 0) {
      elapsedRef.current = Date.now() - startTimeRef.current
    }

    if (phase === 'gameOver' && !submittedRef.current) {
      submittedRef.current = true
      const durationMs = elapsedRef.current
      const finalScore = state?.score ?? 0

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'brick-blast',
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
    }
    if (phase === 'playing') {
      submittedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state?.score, player, submitScore])

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!state) return
      const key = e.key.toLowerCase()

      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault()
        setState(prev => prev ? updatePaddle(prev, prev.paddle.position.x - prev.paddle.width, 1/60) : prev)
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault()
        setState(prev => prev ? updatePaddle(prev, prev.paddle.position.x + prev.paddle.width, 1/60) : prev)
      } else if (key === ' ' || key === 'spacebar') {
        e.preventDefault()
        if (phase === 'idle') {
          setState(prev => prev ? launchBall(prev) : prev)
          setPhase('playing')
        } else if (phase === 'playing') {
          setPhase('paused')
        } else if (phase === 'paused') {
          setPhase('playing')
        }
      } else if (key === 'p' || key === 'escape') {
        e.preventDefault()
        if (phase === 'playing') setPhase('paused')
        else if (phase === 'paused') setPhase('playing')
      } else if (key === 'r') {
        e.preventDefault()
        if (phase === 'gameOver') {
          setState(prev => prev ? restartGame(prev) : prev)
          setPhase('idle')
          setSaveState(null)
        }
      } else if (key === 'n' && phase === 'levelComplete') {
        e.preventDefault()
        setState(prev => prev ? nextLevel(prev) : prev)
        setPhase('idle')
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, state])

  // Mouse controls
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state || phase !== 'playing') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    setState(prev => prev ? updatePaddle(prev, x, 1/60) : prev)
  }, [state, phase])

  // Touch controls
  const touchStartRef = useRef<{ x: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    touchStartRef.current = { x: touch.clientX - rect.left }
  }, [phase])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!state || phase !== 'playing' || !touchStartRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const x = touch.clientX - rect.left
    setState(prev => prev ? updatePaddle(prev, x, 1/60) : prev)
  }, [state, phase])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = null
  }, [])

  // Click to launch
  const handleClick = useCallback(() => {
    if (phase === 'idle') {
      setState(prev => prev ? launchBall(prev) : prev)
      setPhase('playing')
    }
  }, [phase])

  // Game actions
  const handleStart = useCallback(() => {
    if (!state) return
    setState(prev => prev ? launchBall(prev) : prev)
    setPhase('playing')
  }, [state])

  const handlePause = useCallback(() => {
    if (phase === 'playing') setPhase('paused')
  }, [phase])

  const handleResume = useCallback(() => {
    if (phase === 'paused') setPhase('playing')
  }, [phase])

  const handleRestart = useCallback(() => {
    setState(prev => prev ? restartGame(prev) : prev)
    setPhase('idle')
    setSaveState(null)
  }, [])

  const handleNextLevel = useCallback(() => {
    setState(prev => prev ? nextLevel(prev) : prev)
    setPhase('idle')
  }, [])

  // Prevent scrolling on mobile when touching canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const preventScroll = (e: TouchEvent) => {
      if (phase === 'playing') e.preventDefault()
    }

    canvas.addEventListener('touchmove', preventScroll, { passive: false })
    return () => canvas.removeEventListener('touchmove', preventScroll)
  }, [phase])

  const bounds = state ? getGameBounds(state) : null
  const remainingDestructible = state ? state.bricks.filter(b => b.type !== 'unbreakable').length : 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🧱 Brick Blast</h1>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-800 bg-dark-900 px-5 py-3">
        <span className="text-sm text-dark-400">
          Score: <span className="text-xl font-bold text-white">{state?.score ?? 0}</span>
        </span>
        <span className="text-sm text-dark-400">
          Level: <span className="font-bold text-primary-400">{state?.level ?? 1}</span>
        </span>
        <span className="text-sm text-dark-400">
          Bricks: <span className="font-bold text-amber-400">{remainingDestructible}</span>
        </span>
        <span className="text-sm text-dark-400">
          Lives:{' '}
          <span className="font-bold text-red-400">
            {state ? '♥'.repeat(state.lives) + '♡'.repeat(3 - state.lives) : '♥♥♥'}
          </span>
        </span>
        {state && state.combo > 1 && (
          <span className="text-sm text-pink-400 font-bold">
            Combo x{state.combo}!
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        className="relative mt-4 w-full touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-xl border border-dark-700 bg-dark-950"
          style={{ aspectRatio: '4 / 3' }}
          onMouseMove={handleMouseMove}
          aria-label="Brick Blast game canvas"
        />

        {/* Overlay */}
        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/90 backdrop-blur-sm p-6">
            {phase === 'idle' && (
              <>
                <p className="text-2xl font-bold text-white">Brick Blast</p>
                <p className="mt-2 max-w-sm text-sm text-dark-400 text-center">
                  Bounce the ball to destroy all bricks. Some bricks need multiple hits.
                  Explosive bricks clear nearby blocks. Multiplier bricks boost your score!
                </p>
                <div className="mt-4 text-sm text-dark-500 space-y-1 text-left max-w-xs">
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">←/→</kbd> or <kbd className="px-1.5 py-0.5 bg-dark-800 rounded">A/D</kbd> — Move paddle</p>
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">Space</kbd> — Launch / Pause</p>
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">P / Esc</kbd> — Pause</p>
                  <p>Mouse/Touch — Drag to move paddle</p>
                </div>
                <Button onClick={handleStart} size="lg" className="mt-6">
                  Start Game
                </Button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p className="text-2xl font-bold text-white">Paused</p>
                <p className="mt-2 text-sm text-dark-400">Click Resume or press Space to continue</p>
                <div className="mt-4 flex gap-3">
                  <Button onClick={handleResume} className="flex-1">
                    ▶ Resume
                  </Button>
                  <Button variant="danger" onClick={handleRestart} className="flex-1">
                    ↻ Restart
                  </Button>
                </div>
              </>
            )}
            {phase === 'levelComplete' && state && (
              <>
                <p className="text-2xl font-bold text-green-400">Level Complete!</p>
                <p className="mt-2 text-3xl font-bold text-white">{state.score} pts</p>
                <p className="mt-1 text-sm text-dark-400">Bricks cleared: {state.bricks.filter(b => b.type !== 'unbreakable').length === 0 ? 'All!' : 'Some remain'}</p>
                <Button onClick={handleNextLevel} size="lg" className="mt-6">
                  Next Level →
                </Button>
              </>
            )}
            {phase === 'gameOver' && state && (
              <>
                <p className="text-2xl font-bold text-red-400">Game Over!</p>
                <p className="mt-2 text-4xl font-bold text-white">{state.score} pts</p>
                <p className="mt-1 text-sm text-dark-400">Level reached: {state.level}</p>
                {saveState === 'saved' && (
                  <p className="mt-2 text-sm text-primary-400">Score saved ✓</p>
                )}
                {saveState === 'error' && (
                  <p className="mt-2 text-sm text-red-400">Failed to save score</p>
                )}
                {saveState === 'guest' && (
                  <p className="mt-2 text-sm text-dark-400">
                    <Link href="/login" className="text-primary-400 hover:text-primary-300">
                      Log in
                    </Link>{' '}
                    to save your score
                  </p>
                )}
                <Button onClick={handleRestart} size="lg" className="mt-6">
                  Play Again
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {phase === 'playing' && (
          <Button variant="secondary" onClick={handlePause}>
            ⏸ Pause
          </Button>
        )}
        {phase === 'paused' && (
          <Button onClick={handleResume}>▶ Resume</Button>
        )}
        {(phase === 'playing' || phase === 'paused') && (
          <Button variant="danger" onClick={handleRestart}>
            ↻ Restart
          </Button>
        )}
      </div>

      {/* Mobile on-screen controls */}
      <div className="mx-auto mt-6 flex max-w-48 gap-2 sm:hidden">
        <Button
          variant="secondary"
          onClick={() => setState(prev => prev ? updatePaddle(prev, prev.paddle.position.x - prev.paddle.width * 2, 1/60) : prev)}
          disabled={phase !== 'playing'}
          aria-label="Move left"
          className="flex-1 h-14"
        >
          ◀
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (phase === 'idle') handleStart()
            else if (phase === 'playing') handlePause()
            else if (phase === 'paused') handleResume()
          }}
          disabled={phase === 'gameOver' || phase === 'levelComplete'}
          aria-label="Launch/Pause"
          className="flex-1 h-14"
        >
          {phase === 'idle' ? '▶' : phase === 'playing' ? '⏸' : '▶'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setState(prev => prev ? updatePaddle(prev, prev.paddle.position.x + prev.paddle.width * 2, 1/60) : prev)}
          disabled={phase !== 'playing'}
          aria-label="Move right"
          className="flex-1 h-14"
        >
          ▶
        </Button>
      </div>

      <p className="mt-4 text-center text-sm text-dark-500">
        Move paddle with ←/→ or A/D (or drag mouse/touch). Space to launch/pause.
        Destroy all bricks to advance. Explosive bricks clear neighbors!
      </p>
    </div>
  )
}