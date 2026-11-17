'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  createDeck,
  flipCard,
  unflipMismatched,
  DIFFICULTY_PAIRS,
  DIFFICULTY_GRID,
  type Difficulty,
  type MemoryCard,
} from './logic'
import { useAuth } from '@/features/auth/use-auth'
import { useScoreSubmit } from '@/features/auth/use-score-submit'
import { Button } from '@/components/ui/button'

type Phase = 'idle' | 'playing' | 'won'

export function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [cards, setCards] = useState<MemoryCard[]>(() => createDeck('easy'))
  const [phase, setPhase] = useState<Phase>('idle')
  const [moves, setMoves] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [best, setBest] = useState<{ time: number; moves: number } | null>(null)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error' | 'guest' | null>(null)
  const [mismatchFlash, setMismatchFlash] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)
  const unflipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { player } = useAuth()
  const { submitScore } = useScoreSubmit()

  const loadBest = useCallback((d: Difficulty) => {
    if (!player) {
      setBest(null)
      return
    }
    fetch(`/api/scores/personal-best?game=memory&difficulty=${d}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.personalBest) {
          setBest({
            time: json.data.personalBest.completionTime,
            moves: json.data.personalBest.score, // moves stored in score field
          })
        } else {
          setBest(null)
        }
      })
      .catch(() => setBest(null))
  }, [player])

  useEffect(() => {
    loadBest(difficulty)
  }, [difficulty, loadBest])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => () => {
    stopTimer()
    if (unflipTimerRef.current) clearTimeout(unflipTimerRef.current)
  }, [])

  const startGame = (d: Difficulty = difficulty) => {
    if (unflipTimerRef.current) clearTimeout(unflipTimerRef.current)
    setCards(createDeck(d))
    setMoves(0)
    setElapsedMs(0)
    setSaveState(null)
    setMismatchFlash(false)
    setPhase('playing')
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current)
    }, 100)
  }

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d)
    setPhase('idle')
    setCards(createDeck(d))
    setMoves(0)
    setElapsedMs(0)
    setSaveState(null)
    stopTimer()
  }

  const handleFlip = (index: number) => {
    if (phase !== 'playing') return
    if (unflipTimerRef.current) return // waiting for mismatch flip-back

    const outcome = flipCard(cards, index, moves)
    if (!outcome) return

    setCards(outcome.cards)
    setMoves(outcome.moves)

    if (outcome.allMatched) {
      // Won!
      stopTimer()
      const completionMs = Date.now() - startRef.current
      setElapsedMs(completionMs)
      setPhase('won')

      if (player) {
        setSaveState('saving')
        submitScore({
          gameKey: 'memory',
          score: outcome.moves,
          completionTime: Math.round(completionMs),
          difficulty,
        }).then((result) => {
          if (result.ok) {
            setSaveState('saved')
            setBest((b) =>
              b === null || completionMs < b.time
                ? { time: completionMs, moves: outcome.moves }
                : b
            )
          } else {
            setSaveState('error')
          }
        })
      } else {
        setSaveState('guest')
        setBest((b) =>
          b === null || completionMs < b.time ? { time: completionMs, moves: outcome.moves } : b
        )
      }
      return
    }

    if (outcome.cards.filter((c) => c.flipped && !c.matched).length === 2) {
      // Second card flipped; if mismatch, flip back after a delay
      const isMatch = outcome.isMatch
      if (!isMatch) {
        setMismatchFlash(true)
        unflipTimerRef.current = setTimeout(() => {
          setCards((cs) => unflipMismatched(cs))
          setMismatchFlash(false)
          unflipTimerRef.current = null
        }, 800)
      }
    }
  }

  const faceUpCount = cards.filter((c) => c.flipped && !c.matched).length
  const matchedPairs = cards.filter((c) => c.matched).length / 2

  const cols = DIFFICULTY_GRID[difficulty].cols

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/games" className="text-sm text-dark-400 hover:text-white">
          ← All games
        </Link>
        <h1 className="text-2xl font-bold text-white">🃏 Memory Game</h1>
        <div className="text-right text-sm">
          {best !== null ? (
            <span className="text-dark-400">
              Best:{' '}
              <span className="font-bold text-primary-400">
                {(best.time / 1000).toFixed(1)}s
              </span>{' '}
              <span className="text-dark-500">({best.moves} moves)</span>
            </span>
          ) : (
            <span className="text-dark-500">No best yet</span>
          )}
        </div>
      </div>

      {/* Difficulty tabs */}
      <div className="mt-4 flex justify-center gap-2">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => changeDifficulty(d)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
              difficulty === d
                ? 'bg-violet-500 text-white'
                : 'border border-dark-700 bg-dark-900 text-dark-300 hover:bg-dark-800'
            }`}
          >
            {d} ({DIFFICULTY_PAIRS[d]} pairs)
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-dark-800 bg-dark-900 px-5 py-3 text-sm">
        <span className="text-dark-400">
          Time:{' '}
          <span className="font-mono text-lg font-bold text-white">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </span>
        <span className="text-dark-400">
          Moves: <span className="text-lg font-bold text-white">{moves}</span>
        </span>
        <span className="text-dark-400">
          Pairs: <span className="text-lg font-bold text-white">{matchedPairs}/{DIFFICULTY_PAIRS[difficulty]}</span>
        </span>
      </div>

      {/* Board */}
      <div className="relative mt-4">
        <div
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => handleFlip(i)}
              disabled={phase !== 'playing' || card.flipped || card.matched}
              className="relative aspect-square w-full transition-transform duration-200"
              style={{
                transform: card.flipped || card.matched ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
              }}
              aria-label={card.flipped || card.matched ? card.emoji : 'Hidden card'}
            >
              {/* Back (face down) */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-lg border border-dark-700 bg-gradient-to-br from-violet-600 to-purple-800 text-2xl"
                style={{ backfaceVisibility: 'hidden' }}
              >
                ❓
              </div>
              {/* Front (face up) */}
              <div
                className={`absolute inset-0 flex items-center justify-center rounded-lg border text-2xl sm:text-4xl ${
                  card.matched
                    ? 'border-primary-500/50 bg-primary-500/15'
                    : mismatchFlash && card.flipped
                      ? 'border-red-500/50 bg-red-500/15'
                      : 'border-dark-600 bg-dark-800'
                }`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {card.emoji}
              </div>
            </button>
          ))}
        </div>

        {/* Overlays */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/85 backdrop-blur-sm">
            <p className="text-xl font-bold text-white">Find all the pairs!</p>
            <p className="mt-2 text-sm text-dark-400">
              {DIFFICULTY_PAIRS[difficulty]} pairs · fastest time wins
            </p>
            <Button onClick={() => startGame()} size="lg" className="mt-5">
              Start Game
            </Button>
          </div>
        )}
        {phase === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-dark-950/85 backdrop-blur-sm">
            <p className="text-xl font-bold text-primary-400">🎉 All pairs found!</p>
            <p className="mt-2 text-3xl font-bold text-white">{(elapsedMs / 1000).toFixed(1)}s</p>
            <p className="text-sm text-dark-400">{moves} moves</p>
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
                to save your time
              </p>
            )}
            <Button onClick={() => startGame()} className="mt-5">
              Play Again
            </Button>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <p className="mt-4 text-center text-sm text-dark-500">
          Face-up cards: {faceUpCount}/2 — find the matching pair!
        </p>
      )}
    </div>
  )
}
