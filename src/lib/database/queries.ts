import { getSupabaseAdmin } from './supabase'
import type { Game } from '@/types/game'
import type { Player, PlayerStats } from '@/types/player'

// ------------------------------------------------------------
// Players
// ------------------------------------------------------------

export async function getPlayerByHandle(handle: string): Promise<(Player & { password_hash: string }) | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .select('id, player_id, password_hash, created_at, updated_at')
    .ilike('player_id', handle)
    .maybeSingle()

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as (Player & { password_hash: string }) | null
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .select('id, player_id, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as Player | null
}

export async function createPlayer(
  handle: string,
  passwordHash: string
): Promise<Player> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .insert({ player_id: handle, password_hash: passwordHash })
    .select('id, player_id, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Player ID already exists')
    }
    throw new Error(`Database error: ${error.message}`)
  }

  // Create initial stats row
  await supabase.from('player_stats').insert({ player_id: data.id })

  return data as Player
}

export async function updatePlayerHandle(id: string, newHandle: string): Promise<Player> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .update({ player_id: newHandle })
    .eq('id', id)
    .select('id, player_id, created_at, updated_at')
    .single()

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as Player
}

// ------------------------------------------------------------
// Games
// ------------------------------------------------------------

export async function getGameByKey(gameKey: string): Promise<Game | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('game_key', gameKey)
    .maybeSingle()

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as Game | null
}

export async function getAllGames(): Promise<Game[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Database error: ${error.message}`)
  return (data ?? []) as Game[]
}

// ------------------------------------------------------------
// Player stats
// ------------------------------------------------------------

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle()

  if (error) throw new Error(`Database error: ${error.message}`)
  return data as PlayerStats | null
}

export async function incrementPlayerStats(
  playerId: string,
  gamesDelta: number,
  playTimeMsDelta: number
): Promise<void> {
  const supabase = getSupabaseAdmin()
  // Upsert-safe increment: fetch, add, write (Supabase JS doesn't have SQL expressions directly)
  const existing = await getPlayerStats(playerId)
  const currentGames = existing?.total_games_played ?? 0
  const currentTime = existing?.total_play_time ?? 0

  const { error } = await supabase.from('player_stats').upsert(
    {
      player_id: playerId,
      total_games_played: currentGames + gamesDelta,
      total_play_time: currentTime + playTimeMsDelta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' }
  )

  if (error) throw new Error(`Database error: ${error.message}`)
}
