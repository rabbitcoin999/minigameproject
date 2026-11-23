import type { GameKey, Difficulty } from '@/types/game'

// ------------------------------------------------------------
// Server-side score validation rules per game (anti-cheat layer)
// These are sanity bounds: a submitted score must be plausible.
// ------------------------------------------------------------

export interface ScoreRule {
  maxScore: number
  // Games with a duration: minimum time in ms needed to achieve maxScore
  minDurationPerPoint?: number
  requiresCompletionTime?: boolean
  requiresDifficulty?: boolean
  minCompletionTime?: number
  maxCompletionTime?: number
  description: string
}

export const SCORE_RULES: Record<GameKey, ScoreRule> = {
  snake: {
    maxScore: 10_000,
    // Each food = 10 pts; eating needs >= ~600ms per food realistically at high speed... be generous
    minDurationPerPoint: 100,
    description: 'Snake score from food collected (10 per food).',
  },
  '2048': {
    maxScore: 2_000_000,
    minDurationPerPoint: 0.5,
    description: '2048 score from tile merges.',
  },
  memory: {
    // `score` holds the move count; ranking uses completion_time primarily.
    maxScore: 500,
    requiresCompletionTime: true,
    requiresDifficulty: true,
    minCompletionTime: 2_000, // Can't possibly finish in under 2s
    maxCompletionTime: 3_600_000, // 1 hour cap
    description: 'Memory: completion_time (ms) is the primary rank; score holds move count.',
  },
  reaction: {
    maxScore: 5_000, // average reaction ms; lower is better
    requiresCompletionTime: false,
    minCompletionTime: 100, // human minimum avg reaction
    maxCompletionTime: 2_000,
    description: 'Reaction: score is average reaction time (ms); lower is better.',
  },
  'whack-a-mole': {
    maxScore: 300, // 30s game; with bonuses ~ a few moles per second max
    minDurationPerPoint: 80,
    description: 'Whack-a-Mole score from moles hit in 30 seconds.',
  },
  runner: {
    maxScore: 25_000,
    minDurationPerPoint: 40,
    description: 'Runner: score is distance survived in meters; ~33 ms per meter at max speed.',
  },
  'brick-blast': {
    maxScore: 500_000, // Theoretical max across many levels
    minDurationPerPoint: 50,
    description: 'Brick Blast: score from destroying bricks across multiple levels.',
  },
}

export interface ScoreValidationInput {
  gameKey: GameKey
  score: number
  completionTime: number | null
  difficulty: Difficulty | null
  playDurationMs: number | null
}

export interface ScoreValidationResult {
  valid: boolean
  reason?: string
}

export function validateScoreRules(input: ScoreValidationInput): ScoreValidationResult {
  const rule = SCORE_RULES[input.gameKey]
  if (!rule) {
    return { valid: false, reason: 'Unknown game' }
  }

  // Difficulty checks
  if (rule.requiresDifficulty && !input.difficulty) {
    return { valid: false, reason: 'This game requires a difficulty level.' }
  }
  if (input.difficulty && !rule.requiresDifficulty) {
    return { valid: false, reason: 'This game does not accept a difficulty level.' }
  }

  // Completion time checks
  if (rule.requiresCompletionTime && (input.completionTime === null || input.completionTime <= 0)) {
    return { valid: false, reason: 'This game requires a valid completion time.' }
  }

  if (input.completionTime !== null && rule.minCompletionTime !== undefined) {
    if (input.completionTime < rule.minCompletionTime) {
      return { valid: false, reason: 'Completion time is impossibly fast.' }
    }
  }

  if (input.completionTime !== null && rule.maxCompletionTime !== undefined) {
    if (input.completionTime > rule.maxCompletionTime) {
      return { valid: false, reason: 'Completion time is too long.' }
    }
  }

  // Reaction game: score IS the average reaction time; check bounds
  if (input.gameKey === 'reaction') {
    if (input.score < rule.minCompletionTime! || input.score > rule.maxCompletionTime!) {
      return { valid: false, reason: 'Reaction time out of plausible range.' }
    }
  }

  // Score upper bound (memory: move count cap, not 0)
  const maxScore = input.gameKey === 'reaction' ? rule.maxCompletionTime! : rule.maxScore
  if (input.score > maxScore) {
    return { valid: false, reason: 'Score exceeds the maximum possible for this game.' }
  }

  // Memory: too few moves for the pair count means the submission is bogus
  if (input.gameKey === 'memory' && input.difficulty) {
    const requiredMoves = { easy: 4, medium: 8, hard: 12 }[input.difficulty]
    if (input.score < requiredMoves) {
      return { valid: false, reason: 'Move count is lower than the number of pairs.' }
    }
  }

  // Play duration sanity: score-per-time plausibility
  if (
    input.playDurationMs !== null &&
    input.playDurationMs > 0 &&
    rule.minDurationPerPoint !== undefined &&
    rule.minDurationPerPoint > 0
  ) {
    const pointsPerMs = input.score / input.playDurationMs
    const maxPointsPerMs = 1 / rule.minDurationPerPoint
    if (pointsPerMs > maxPointsPerMs * 3) {
      // 3x tolerance for scoring variance
      return { valid: false, reason: 'Score is implausibly high for the play duration.' }
    }
  }

  // For timed games (memory, reaction): play duration should roughly match completion time
  if (
    input.playDurationMs !== null &&
    input.completionTime !== null &&
    input.gameKey !== '2048'
  ) {
    // Completion time should be within [50%, 200%] of play duration... generous
    if (input.completionTime > input.playDurationMs * 2) {
      return { valid: false, reason: 'Completion time exceeds session duration.' }
    }
  }

  return { valid: true }
}
