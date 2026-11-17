// Memory game logic — pure functions, no React

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_PAIRS: Record<Difficulty, number> = {
  easy: 4,
  medium: 8,
  hard: 12,
}

export const CARD_EMOJIS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄',
  '🐔', '🐧', '🐦', '🦉', '🦇', '🐺', '🐗', '🐴', '🦋', '🐝', '🐞', '🐢',
]

export interface MemoryCard {
  id: number
  emoji: string
  pairId: number
  flipped: boolean
  matched: boolean
}

export function createDeck(difficulty: Difficulty): MemoryCard[] {
  const pairs = DIFFICULTY_PAIRS[difficulty]
  const chosen = CARD_EMOJIS.slice(0, pairs)

  const cards: MemoryCard[] = []
  for (let pairId = 0; pairId < pairs; pairId++) {
    cards.push({
      id: pairId * 2,
      emoji: chosen[pairId],
      pairId,
      flipped: false,
      matched: false,
    })
    cards.push({
      id: pairId * 2 + 1,
      emoji: chosen[pairId],
      pairId,
      flipped: false,
      matched: false,
    })
  }

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }

  return cards
}

export interface FlipOutcome {
  cards: MemoryCard[]
  isMatch: boolean
  moves: number
  allMatched: boolean
}

/** Player flips the card at `index`. Returns updated deck + outcome. */
export function flipCard(
  cards: MemoryCard[],
  index: number,
  moves: number
): FlipOutcome | null {
  const card = cards[index]
  if (!card || card.flipped || card.matched) return null

  const faceUp = cards.filter((c) => c.flipped && !c.matched)

  // If two cards are already face up and waiting to be resolved, ignore
  if (faceUp.length >= 2) return null

  const newCards = cards.map((c, i) => (i === index ? { ...c, flipped: true } : c))
  const newMoves = moves + (faceUp.length === 1 ? 1 : 0) // a "move" = a pair of flips

  if (faceUp.length === 0) {
    const noMatch: FlipOutcome = { cards: newCards, isMatch: false, moves: newMoves, allMatched: false }
    return noMatch
  }

  // This is the second flip — check for match
  const first = faceUp[0]
  const isMatch = first.pairId === card.pairId

  if (isMatch) {
    const matched = newCards.map((c) =>
      c.pairId === card.pairId ? { ...c, matched: true, flipped: true } : c
    )
    const allMatched = matched.every((c) => c.matched)
    return { cards: matched, isMatch: true, moves: newMoves, allMatched }
  }

  return { cards: newCards, isMatch: false, moves: newMoves, allMatched: false }
}

/** Flip non-matched face-up cards back down. */
export function unflipMismatched(cards: MemoryCard[]): MemoryCard[] {
  return cards.map((c) => (c.flipped && !c.matched ? { ...c, flipped: false } : c))
}

export const DIFFICULTY_GRID: Record<Difficulty, { cols: number }> = {
  easy: { cols: 4 }, // 8 cards
  medium: { cols: 4 }, // 16 cards
  hard: { cols: 6 }, // 24 cards
}
