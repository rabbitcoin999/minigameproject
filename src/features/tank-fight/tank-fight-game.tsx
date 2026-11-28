'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  createInitialState,
  tick,
  spawnWave,
  createInput,
  createZeroInput,
  formatScore,
  formatWave,
  formatLives,
} from './logic'
import type { GameState, GamePhase, PlayerInput } from './types'
import { ARENA_WIDTH, ARENA_HEIGHT, TANK_BODY_RADIUS, TANK_TURRET_LENGTH, TANK_TURRET_WIDTH } from './constants'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { useSound } from '@/lib/sound/sound-context'
import { Button } from '@/components/ui/button'

type Phase = GamePhase

interface TouchJoystick {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  id: number | null
}

export function TankFightGame() {
  const [state, setState] = useState<GameState>(createInitialState)
  const [phase, setPhase] = useState<Phase>('idle')
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)
  const submittedRef = useRef(false)

  // Input state
  const moveDirRef = useRef({ x: 0, y: 0 })
  const aimAngleRef = useRef(0)
  const fireRef = useRef(false)
  const keysPressedRef = useRef<Set<string>>(new Set())

  // Touch controls
  const moveJoystickRef = useRef<TouchJoystick>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    id: null,
  })
  const aimJoystickRef = useRef<TouchJoystick>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    id: null,
  })
  const fireTouchRef = useRef<number | null>(null)

  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const { play } = useSound()

  // Load personal best
  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=tank-fight')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressedRef.current.add(key)

      // Movement
      if (key === 'w' || key === 'arrowup') moveDirRef.current.y = -1
      if (key === 's' || key === 'arrowdown') moveDirRef.current.y = 1
      if (key === 'a' || key === 'arrowleft') moveDirRef.current.x = -1
      if (key === 'd' || key === 'arrowright') moveDirRef.current.x = 1

      // Fire
      if (key === ' ' || key === 'spacebar') {
        e.preventDefault()
        fireRef.current = true
      }

      // Pause
      if (key === 'p' || key === 'escape') {
        e.preventDefault()
        setPhase((p) => {
          if (p === 'playing') return 'paused'
          if (p === 'paused') return 'playing'
          return p
        })
        if (phase === 'playing') play('pause')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressedRef.current.delete(key)

      // Movement
      if (key === 'w' || key === 'arrowup') {
        if (!keysPressedRef.current.has('s') && !keysPressedRef.current.has('arrowdown')) moveDirRef.current.y = 0
      }
      if (key === 's' || key === 'arrowdown') {
        if (!keysPressedRef.current.has('w') && !keysPressedRef.current.has('arrowup')) moveDirRef.current.y = 0
      }
      if (key === 'a' || key === 'arrowleft') {
        if (!keysPressedRef.current.has('d') && !keysPressedRef.current.has('arrowright')) moveDirRef.current.x = 0
      }
      if (key === 'd' || key === 'arrowright') {
        if (!keysPressedRef.current.has('a') && !keysPressedRef.current.has('arrowleft')) moveDirRef.current.x = 0
      }

      // Fire
      if (key === ' ' || key === 'spacebar') {
        fireRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [phase, play])

  // Mouse aim
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      aimAngleRef.current = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) fireRef.current = true
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) fireRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Touch controls - Move joystick (left side)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    for (const touch of Array.from(e.changedTouches)) {
      const x = touch.clientX
      const y = touch.clientY
      const width = window.innerWidth

      // Left side = move joystick
      if (x < width / 2) {
        moveJoystickRef.current = {
          active: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          id: touch.identifier,
        }
      }
      // Right side = aim joystick
      else if (x > width / 2 && y > window.innerHeight / 2) {
        aimJoystickRef.current = {
          active: true,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          id: touch.identifier,
        }
      }
      // Fire button area (bottom right)
      else if (x > width / 2 && y < window.innerHeight / 2) {
        fireTouchRef.current = touch.identifier
        fireRef.current = true
      }
    }
  }, [phase])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    e.preventDefault()
    for (const touch of Array.from(e.changedTouches)) {
      const x = touch.clientX
      const y = touch.clientY

      // Update move joystick
      if (moveJoystickRef.current.active && moveJoystickRef.current.id === touch.identifier) {
        moveJoystickRef.current.currentX = x
        moveJoystickRef.current.currentY = y
        const dx = x - moveJoystickRef.current.startX
        const dy = y - moveJoystickRef.current.startY
        const dist = Math.hypot(dx, dy)
        if (dist > 10) {
          moveDirRef.current.x = dx / dist
          moveDirRef.current.y = dy / dist
        }
      }

      // Update aim joystick
      if (aimJoystickRef.current.active && aimJoystickRef.current.id === touch.identifier) {
        aimJoystickRef.current.currentX = x
        aimJoystickRef.current.currentY = y
        const dx = x - aimJoystickRef.current.startX
        const dy = y - aimJoystickRef.current.startY
        const dist = Math.hypot(dx, dy)
        if (dist > 10) {
          aimAngleRef.current = Math.atan2(dy, dx)
        }
      }
    }
  }, [phase])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (const touch of Array.from(e.changedTouches)) {
      if (moveJoystickRef.current.id === touch.identifier) {
        moveJoystickRef.current = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, id: null }
        moveDirRef.current = { x: 0, y: 0 }
      }
      if (aimJoystickRef.current.id === touch.identifier) {
        aimJoystickRef.current = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, id: null }
      }
      if (fireTouchRef.current === touch.identifier) {
        fireTouchRef.current = null
        fireRef.current = false
      }
    }
  }, [])

  // Render function (called from game loop)
  const render = useCallback((
    gameState: GameState,
    ctx: CanvasRenderingContext2D
  ) => {
    // Clear
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let x = 0; x <= ARENA_WIDTH; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ARENA_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(ARENA_WIDTH, y)
      ctx.stroke()
    }

    // Arena border
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Bullets
    for (const bullet of gameState.bullets) {
      drawBullet(ctx, bullet)
    }

    // Enemies
    for (const enemy of gameState.enemies) {
      drawTank(ctx, {
        pos: enemy.pos,
        angle: enemy.angle,
        color: enemy.color,
        turretColor: enemy.turretColor,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        isPlayer: false,
      })
    }

    // Player
    if (gameState.player) {
      drawTank(ctx, {
        pos: gameState.player.pos,
        angle: gameState.player.angle,
        color: gameState.player.color,
        turretColor: gameState.player.turretColor,
        health: gameState.player.health,
        maxHealth: gameState.player.maxHealth,
        isPlayer: true,
      })
    }
  }, [])

  // Game loop (merged with render)
  useEffect(() => {
    // Run during both playing and waveTransition so the timer counts down
    if (phase !== 'playing' && phase !== 'waveTransition') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const dt = Math.min(timestamp - lastTimeRef.current, 100) // Cap at 100ms
      lastTimeRef.current = timestamp

      // Normalize move direction
      const moveLen = Math.hypot(moveDirRef.current.x, moveDirRef.current.y)
      const normalizedMoveDir = moveLen > 0
        ? { x: moveDirRef.current.x / moveLen, y: moveDirRef.current.y / moveLen }
        : { x: 0, y: 0 }

      const input = createInput(normalizedMoveDir, aimAngleRef.current, fireRef.current)

      setState((prev) => {
        if (!prev) return prev
        const next = tick(prev, input, dt)

        // Sound effects
        if (next.score > prev.score) play('score')
        if (next.phase !== prev.phase) {
          if (next.phase === 'waveTransition') play('levelUp')
          else if (next.phase === 'gameOver') play('gameOver')
        }
        // Check for new enemy bullets (enemy fired)
        if (next.bullets.length > prev.bullets.length) {
          const newEnemyBullets = next.bullets.filter(b => b.ownerId !== next.player?.id)
          const prevEnemyBullets = prev.bullets.filter(b => b.ownerId !== prev.player?.id)
          if (newEnemyBullets.length > prevEnemyBullets.length) play('shoot')
        }

        setPhase(next.phase)

        // Render immediately after state update
        render(next, ctx)
        return next
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [phase, play, render])

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
      const finalScore = state.score

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'tank-fight',
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
  }, [phase, state.score, player, submitScore])

  // Game actions
  const handleStart = useCallback(() => {
    const newState = spawnWave(createInitialState(), 1)
    setState(newState)
    setPhase('playing')
    lastTimeRef.current = 0
    startTimeRef.current = 0
    elapsedRef.current = 0
    setSaveState(null)
    play('start')
  }, [play])

  const handlePause = useCallback(() => {
    if (phase === 'playing') {
      setPhase('paused')
      play('pause')
    }
  }, [phase, play])

  const handleResume = useCallback(() => {
    if (phase === 'paused') {
      setPhase('playing')
      lastTimeRef.current = 0
    }
  }, [phase])

  const handleRestart = useCallback(() => {
    const newState = spawnWave(createInitialState(), 1)
    setState(newState)
    setPhase('playing')
    lastTimeRef.current = 0
    startTimeRef.current = 0
    elapsedRef.current = 0
    setSaveState(null)
    submittedRef.current = false
  }, [])

  // Render tank
  const drawTank = (
    ctx: CanvasRenderingContext2D,
    tank: { pos: { x: number; y: number }; angle: number; color: string; turretColor: string; health: number; maxHealth: number; isPlayer: boolean }
  ) => {
    ctx.save()
    ctx.translate(tank.pos.x, tank.pos.y)
    ctx.rotate(tank.angle)

    // Tank body
    ctx.fillStyle = tank.color
    ctx.beginPath()
    ctx.roundRect(-TANK_BODY_RADIUS, -TANK_BODY_RADIUS, TANK_BODY_RADIUS * 2, TANK_BODY_RADIUS * 2, 8)
    ctx.fill()

    // Tank tracks
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(-TANK_BODY_RADIUS - 4, -TANK_BODY_RADIUS, 6, TANK_BODY_RADIUS * 2)
    ctx.fillRect(TANK_BODY_RADIUS - 2, -TANK_BODY_RADIUS, 6, TANK_BODY_RADIUS * 2)

    // Turret
    ctx.fillStyle = tank.turretColor
    ctx.fillRect(0, -TANK_TURRET_WIDTH / 2, TANK_TURRET_LENGTH, TANK_TURRET_WIDTH)
    // Turret base
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()

    // Health bar (above tank)
    if (tank.health < tank.maxHealth) {
      ctx.restore()
      ctx.save()
      ctx.translate(tank.pos.x, tank.pos.y - TANK_BODY_RADIUS - 10)
      const barWidth = 40
      const barHeight = 4
      ctx.fillStyle = '#334155'
      ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight)
      ctx.fillStyle = tank.health > tank.maxHealth * 0.5 ? '#22c55e' : '#ef4444'
      ctx.fillRect(-barWidth / 2, 0, barWidth * (tank.health / tank.maxHealth), barHeight)
    }

    ctx.restore()
  }

  // Render bullet
  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: { pos: { x: number; y: number }; vel: { x: number; y: number } }) => {
    const angle = Math.atan2(bullet.vel.y, bullet.vel.x)
    ctx.save()
    ctx.translate(bullet.pos.x, bullet.pos.y)
    ctx.rotate(angle)
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Render explosion particles
  const drawExplosion = (ctx: CanvasRenderingContext2D, pos: { x: number; y: number }, time: number) => {
    // Simple expanding ring effect
    const radius = (time % 200) / 200 * 30
    const alpha = 1 - (time % 200) / 200
    ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Canvas setup (resize, DPI scaling) - runs once on mount + resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const container = canvas.parentElement
      if (!container) return

      const rect = container.getBoundingClientRect()
      const scale = Math.min(rect.width / ARENA_WIDTH, rect.height / ARENA_HEIGHT)
      const width = ARENA_WIDTH * scale
      const height = ARENA_HEIGHT * scale

      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // Reset transform and re-apply scale
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(window.devicePixelRatio * scale, window.devicePixelRatio * scale)
    }

    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
    }
  }, []) // only run once on mount

  // Render for idle/paused states (when game loop isn't running)
  useEffect(() => {
    if (phase === 'playing' || phase === 'waveTransition') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    render(state, ctx)
  }, [phase, state, render])

  const bounds = state ? { x: 0, y: 0, width: ARENA_WIDTH, height: ARENA_HEIGHT } : null
  const remainingEnemies = state ? state.enemies.length : 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🚀 Tank Fight</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best: <span className="font-bold text-primary-400">{best.toLocaleString()}</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dark-800 bg-dark-900 px-5 py-3">
        <span className="text-sm text-dark-400">
          Score: <span className="text-xl font-bold text-white">{formatScore(state.score)}</span>
        </span>
        <span className="text-sm text-dark-400">
          {formatWave(state.wave, state.maxWaves)}
        </span>
        <span className="text-sm text-dark-400">
          Enemies: <span className="font-bold text-red-400">{remainingEnemies}</span>
        </span>
        <span className="text-sm text-dark-400">
          Lives:{' '}
          <span className="font-bold text-red-400">{formatLives(state.lives)}</span>
        </span>
        {state.phase === 'waveTransition' && (
          <span className="text-sm text-yellow-400 font-bold">
            Wave {state.wave} Complete! Next wave in {Math.ceil(state.waveTransitionTimer / 1000)}s...
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        className="relative mt-4 w-full touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-xl border border-dark-700 bg-dark-950"
          style={{ aspectRatio: `${ARENA_WIDTH} / ${ARENA_HEIGHT}` }}
          aria-label="Tank Fight game canvas"
        />

        {/* Touch joystick indicators */}
        {phase === 'playing' && (
          <>
            {/* Move joystick (left) */}
            {moveJoystickRef.current.active && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${moveJoystickRef.current.startX}px`,
                  top: `${moveJoystickRef.current.startY}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="w-32 h-32 rounded-full border-2 border-cyan-500/30 bg-cyan-500/10" />
                <div
                  className="absolute w-16 h-16 rounded-full bg-cyan-500/60"
                  style={{
                    left: `${moveJoystickRef.current.currentX - moveJoystickRef.current.startX}px`,
                    top: `${moveJoystickRef.current.currentY - moveJoystickRef.current.startY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            )}

            {/* Aim joystick (right) */}
            {aimJoystickRef.current.active && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${aimJoystickRef.current.startX}px`,
                  top: `${aimJoystickRef.current.startY}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="w-32 h-32 rounded-full border-2 border-red-500/30 bg-red-500/10" />
                <div
                  className="absolute w-16 h-16 rounded-full bg-red-500/60"
                  style={{
                    left: `${aimJoystickRef.current.currentX - aimJoystickRef.current.startX}px`,
                    top: `${aimJoystickRef.current.currentY - aimJoystickRef.current.startY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            )}

            {/* Fire button indicator */}
            <div
              className="absolute bottom-6 right-6 w-20 h-20 rounded-full border-2 border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-2xl text-amber-500 pointer-events-none"
            >
              FIRE
            </div>
          </>
        )}

        {/* Overlay */}
        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/90 backdrop-blur-sm p-6">
            {phase === 'idle' && (
              <>
                <p className="text-2xl font-bold text-white">Tank Fight</p>
                <p className="mt-2 max-w-sm text-sm text-dark-400 text-center">
                  Survive waves of enemy tanks! Move with WASD, aim with mouse, click/Space to fire.
                </p>
                <div className="mt-4 text-sm text-dark-500 space-y-1 text-left max-w-xs">
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">WASD</kbd> / <kbd className="px-1.5 py-0.5 bg-dark-800 rounded">Arrows</kbd> — Move</p>
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">Mouse</kbd> — Aim turret</p>
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">Click</kbd> / <kbd className="px-1.5 py-0.5 bg-dark-800 rounded">Space</kbd> — Fire</p>
                  <p><kbd className="px-1.5 py-0.5 bg-dark-800 rounded">P / Esc</kbd> — Pause</p>
                  <p>Mobile: Left area = move, Right area = aim, Top-right = fire</p>
                </div>
                <Button onClick={handleStart} size="lg" className="mt-6">
                  Start Game
                </Button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p className="text-2xl font-bold text-white">Paused</p>
                <p className="mt-2 text-sm text-dark-400">Click Resume or press P/Esc to continue</p>
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
            {phase === 'waveTransition' && (
              <>
                <p className="text-2xl font-bold text-green-400">Wave {state.wave} Complete!</p>
                <p className="mt-2 text-3xl font-bold text-white">{formatScore(state.score)}</p>
                <p className="mt-1 text-sm text-dark-400">Next wave incoming in {Math.ceil(state.waveTransitionTimer / 1000)}s...</p>
              </>
            )}
            {phase === 'gameOver' && (
              <>
                <p className="text-2xl font-bold text-red-400">Game Over!</p>
                <p className="mt-2 text-4xl font-bold text-white">{formatScore(state.score)}</p>
                <p className="mt-1 text-sm text-dark-400">Waves survived: {state.wave}</p>
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

      <p className="mt-4 text-center text-sm text-dark-500">
        WASD/Arrows to move, Mouse to aim, Click/Space to fire. Survive all {state.maxWaves} waves!
      </p>
    </div>
  )
}