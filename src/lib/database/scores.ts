import { getSupabaseAdmin } from './supabase'
import type { GameKey, Difficulty, GameScore } from '@/types/game'

export interface SubmitScoreInput {
  playerId: string // UUID
  gameId: string // UUID
  score: number
  completionTime: number | null
  difficulty: Difficulty | null
  playDurationMs: number | null
  sessionToken: string | null
}

export interface SubmitScoreResult {
  scoreId: string
  isNewPersonalBest: boolean
  previousBest: number | null
}

export async function submitScore(input: SubmitScoreInput): Promise<SubmitScoreResult> {
  const supabase = getSupabaseAdmin()

  // Does this game rank lower scores better? (memory, reaction)
  const { data: gameRow, error: gameErr } = await supabase
    .from('games')
    .select('lower_is_better')
    .eq('id', input.gameId)
    .maybeSingle()

  if (gameErr) throw new Error(`Database error: ${gameErr.message}`)
  const lowerIsBetter: boolean = (gameRow as { lower_is_better: boolean } | null)?.lower_is_better ?? false

  // Compute previous best BEFORE inserting, so the just-submitted score
  // doesn't count as its own baseline.
  const previousBest = await getPersonalBestValue(
    input.playerId,
    input.gameId,
    input.difficulty,
    lowerIsBetter
  )

  // Insert the score
  const { data: inserted, error: insertError } = await supabase
    .from('game_scores')
    .insert({
      player_id: input.playerId,
      game_id: input.gameId,
      score: input.score,
      completion_time: input.completionTime,
      difficulty: input.difficulty,
      play_duration_ms: input.playDurationMs,
      session_id: input.sessionToken,
    })
    .select('id')
    .single()

  if (insertError) throw new Error(`Database error: ${insertError.message}`)

  // Mark the game session as completed (if a session token was provided)
  if (input.sessionToken) {
    await supabase
      .from('game_sessions')
      .update({ completed: true })
      .eq('session_token', input.sessionToken)
      .eq('player_id', input.playerId)
  }

  // Update player stats: count this game play, add play duration
  const { error: statsError } = await supabase.rpc('increment_player_stats', {
    p_player_id: input.playerId,
    p_games_delta: 1,
    p_play_time_delta: input.playDurationMs ?? 0,
  })

  if (statsError) {
    // Fall back to manual increment if RPC is not available
    console.warn('increment_player_stats RPC not available, skipping stats update')
  }

  const isNewPersonalBest =
    previousBest === null || (lowerIsBetter ? input.score < previousBest : input.score > previousBest)

  return {
    scoreId: inserted.id,
    isNewPersonalBest,
    previousBest,
  }
}

async function getPersonalBestValue(
  playerId: string,
  gameId: string,
  difficulty: Difficulty | null,
  lowerIsBetter: boolean
): Promise<number | null> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('game_scores')
    .select('score')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .order('score', { ascending: lowerIsBetter })
    .limit(1)

  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  const { data, error } = await query.maybeSingle()
  if (error) return null
  return data?.score ?? null
}

export async function getGameScores(
  playerId: string,
  gameKey: string | null,
  limit = 50,
  offset = 0
): Promise<GameScore[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('game_scores')
    .select(
      'id, player_id, game_id, score, completion_time, difficulty, created_at, games!inner(game_key)'
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (gameKey) {
    query = query.eq('games.game_key', gameKey)
  }

  const { data, error } = await query
  if (error) throw new Error(`Database error: ${error.message}`)
  return (data ?? []) as unknown as GameScore[]
}

export interface PersonalBestRow {
  gameKey: GameKey
  score: number
  completionTime: number | null
  difficulty: Difficulty | null
  achievedAt: string
}

export async function getPersonalBests(playerId: string): Promise<PersonalBestRow[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('game_scores')
    .select(
      'score, completion_time, difficulty, created_at, games!inner(game_key, lower_is_better)'
    )
    .eq('player_id', playerId)

  if (error) throw new Error(`Database error: ${error.message}`)

  const rows = (data ?? []) as unknown as Array<{
    score: number
    completion_time: number | null
    difficulty: Difficulty | null
    created_at: string
    games: { game_key: GameKey; lower_is_better: boolean }
  }>

  // Group by game+difficulty, keep best score
  const bests = new Map<string, PersonalBestRow>()
  for (const row of rows) {
    const key = `${row.games.game_key}:${row.difficulty ?? 'default'}`
    const current = bests.get(key)
    // For "lower is better" games, best = lowest score
    // For "highest is best" games, best = highest score
    const isBetter =
      !current ||
      (row.games.lower_is_better
        ? row.score < current.score
        : row.score > current.score)

    if (isBetter) {
      bests.set(key, {
        gameKey: row.games.game_key,
        score: row.score,
        completionTime: row.completion_time,
        difficulty: row.difficulty,
        achievedAt: row.created_at,
      })
    }
  }

  return Array.from(bests.values())
}

export async function getPersonalBest(
  playerId: string,
  gameKey: string,
  difficulty: Difficulty | null
): Promise<PersonalBestRow | null> {
  const bests = await getPersonalBests(playerId)
  return (
    bests.find(
      (b) => b.gameKey === gameKey && (b.difficulty ?? null) === (difficulty ?? null)
    ) ?? null
  )
}
