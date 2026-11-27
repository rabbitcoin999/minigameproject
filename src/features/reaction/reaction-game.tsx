'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  TOTAL_ROUNDS,
  randomDelay,
  averageReaction,
  ratingFor,
  IMPOSSIBLE_THRESHOLD_MS,
  type Phase,
} from './logic'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { useSound } from '@/lib/sound/sound-context'
import { Button } from '@/components/ui/button'

export function ReactionGame() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState(0)
  const [roundTimes, setRoundTimes] = useState<number[]>([])
  const [lastTime, setLastTime] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyAtRef = useRef<number>(0)
  const clickAtRef = useRef<number>(0)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()
  const { play } = useSound()

  useEffect(() => {
    if (!player) {
      setBest(null)
      return
    }
    fetch('/api/scores/personal-best?game=reaction')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) setBest(json.data.personalBest.score)
      })
      .catch(() => {})
  }, [player])

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => clearTimer, [])

  const startRound = useCallback(() => {
    setPhase('waiting')
    timeoutRef.current = setTimeout(() => {
      readyAtRef.current = performance.now()
      play('score') // "go!" cue — the screen turning green
      setPhase('ready')
    }, randomDelay())
  }, [play])

  const startGame = useCallback(() => {
    setRoundTimes([])
    setRound(1)
    setLastTime(null)
    setSaveState(null)
    play('start')
    startRound()
  }, [startRound, play])

  const finishGame = useCallback(
    (times: number[]) => {
      setPhase('finished')
      const avg = averageReaction(times)

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'reaction',
          score: avg,
        }).then((result) => {
          if (result.ok) {
            setSaveState('saved')
            setBest((b) => (b === null || avg < b ? avg : b))
          } else {
            setSaveState('error')
          }
        })
      } else {
        setSaveState('guest')
        setBest((b) => (b === null || avg < b ? avg : b))
      }
    },
    [player, submitScore]
  )

  const handleClick = () => {
    if (phase === 'waiting') {
      // False start!
      clearTimer()
      play('error')
      setPhase('false-start')
      return
    }

    if (phase === 'ready') {
      const reactionMs = Math.round(performance.now() - readyAtRef.current)
      if (reactionMs < IMPOSSIBLE_THRESHOLD_MS) {
        // Bot-like click — discard round and retry
        play('error')
        setPhase('false-start')
        return
      }
      setLastTime(reactionMs)
      const newTimes = [...roundTimes, reactionMs]
      setRoundTimes(newTimes)

      if (newTimes.length >= TOTAL_ROUNDS) {
        finishGame(newTimes)
      } else {
        setRound((r) => r + 1)
        setPhase('result')
      }
      return
    }

    if (phase === 'result' || phase === 'false-start') {
      startRound()
    }
  }

  const avg = averageReaction(roundTimes)
  const rating = ratingFor(avg)

  const boardStyles: Record<Phase, string> = {
    idle: 'bg-dark-900',
    waiting: 'bg-red-950',
    ready: 'bg-primary-600',
    result: 'bg-dark-900',
    'false-start': 'bg-amber-950',
    finished: 'bg-dark-900',
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">⚡ Reaction Test</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best: <span className="font-bold text-primary-400">{best} ms</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      {/* Round indicator */}
      {(phase !== 'idle' && phase !== 'finished') && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i < roundTimes.length
                  ? 'bg-primary-400'
                  : i === roundTimes.length
                    ? 'bg-primary-600 animate-pulse'
                    : 'bg-dark-700'
              }`}
            />
          ))}
          <span className="ml-2 text-sm text-dark-400">
            Round {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
          </span>
        </div>
      )}

      {/* Click zone — a div with onClick, NOT a disabled <button>: nested
          buttons inside a disabled button never receive clicks, which made
          the game impossible to start. */}
      <div
        onClick={handleClick}
        role="button"
        tabIndex={phase === 'idle' || phase === 'finished' ? -1 : 0}
        aria-disabled={phase === 'idle' || phase === 'finished'}
        className={`mt-4 flex aspect-[4/3] w-full select-none flex-col items-center justify-center rounded-xl border border-dark-700 text-center transition-colors duration-100 ${boardStyles[phase]}`}
      >
        {phase === 'idle' && (
          <>
            <span className="text-2xl font-bold text-white">Test your reflexes</span>
            <span className="mt-2 max-w-sm text-sm text-dark-400">
              {TOTAL_ROUNDS} rounds. Click when the screen turns green. False starts add a
              retry — stay sharp!
            </span>
            <Button onClick={startGame} size="lg" className="mt-6 pointer-events-auto">
              Start Test
            </Button>
          </>
        )}
        {phase === 'waiting' && (
          <>
            <span className="text-2xl font-bold text-red-300">Wait for green…</span>
            <span className="mt-2 text-sm text-red-400/70">Click too early = false start</span>
          </>
        )}
        {phase === 'ready' && (
          <span className="text-4xl font-extrabold text-white drop-shadow-lg">CLICK NOW!</span>
        )}
        {phase === 'result' && (
          <>
            <span className="text-sm text-dark-400">Round {round - 1} result</span>
            <span className="mt-1 text-5xl font-extrabold text-primary-400">{lastTime} ms</span>
            <span className="mt-3 text-sm text-dark-400">Click to continue →</span>
          </>
        )}
        {phase === 'false-start' && (
          <>
            <span className="text-2xl font-bold text-amber-300">⚠ False start!</span>
            <span className="mt-2 text-sm text-amber-400/80">
              Wait for the green screen, then click.
            </span>
            <span className="mt-3 text-sm text-dark-400">Click to retry this round →</span>
          </>
        )}
        {phase === 'finished' && (
          <>
            <span className="text-sm text-dark-400">Average of {TOTAL_ROUNDS} rounds</span>
            <span className="mt-1 text-5xl font-extrabold text-primary-400">{avg} ms</span>
            <span className="mt-2 text-lg text-white">
              {rating.emoji} {rating.label}
            </span>
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
                to save your result
              </p>
            )}
            <Button onClick={startGame} className="mt-6 pointer-events-auto">
              Play Again
            </Button>
          </>
        )}
      </div>

      {/* Round history */}
      {roundTimes.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {roundTimes.map((t, i) => (
            <span
              key={i}
              className="rounded-md bg-dark-800 px-3 py-1.5 font-mono text-sm text-dark-200"
            >
              R{i + 1}: {t} ms
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-sm text-dark-500">
        Works with clicks and taps. Average of {TOTAL_ROUNDS} rounds is your score — lower is
        better.
      </p>
    </div>
  )
}
