-- ============================================================
-- Migration 0002: Leaderboard RPC functions
-- Centralized, deterministic leaderboard queries.
-- ============================================================

-- ------------------------------------------------------------
-- Leaderboard for a single game (optionally filtered by difficulty)
-- Ranking: score DESC (or ASC if lower_is_better), completion_time ASC,
--          created_at ASC as deterministic tie-breaker.
-- Special case: when a game uses completion_time as the primary metric
-- (completion_time IS NOT NULL for that game's attempts, i.e. memory),
-- completion_time ranks first and score (move count) breaks ties.
-- Returns one row per player: their single best attempt.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_game_key VARCHAR,
  p_difficulty VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  player_handle VARCHAR,
  score INTEGER,
  completion_time INTEGER,
  difficulty VARCHAR,
  achieved_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      gs.player_id,
      gs.score,
      gs.completion_time,
      gs.difficulty,
      gs.created_at,
      -- games where completion_time is the true metric: every valid attempt has it
      (g.game_key = 'memory') AS time_primary
    FROM game_scores gs
    JOIN games g ON g.id = gs.game_id
    WHERE g.game_key = p_game_key
      AND (p_difficulty IS NULL OR gs.difficulty = p_difficulty)
      AND (g.lower_is_better OR gs.completion_time IS NOT NULL OR g.game_key <> 'memory')
  ),
  ranked AS (
    SELECT
      f.*,
      ROW_NUMBER() OVER (
        PARTITION BY f.player_id
        ORDER BY
          -- time-primary games: fastest time first, fewer moves breaks ties
          CASE WHEN f.time_primary THEN f.completion_time END ASC NULLS LAST,
          CASE WHEN f.time_primary THEN f.score END ASC NULLS LAST,
          -- score-primary games: higher (or lower) score first
          CASE WHEN NOT f.time_primary AND g.lower_is_better THEN f.score END ASC NULLS LAST,
          CASE WHEN NOT f.time_primary AND NOT g.lower_is_better THEN f.score END DESC NULLS LAST,
          f.completion_time ASC NULLS LAST,
          f.created_at ASC
      ) AS player_rank_internal
    FROM filtered f
    JOIN games g ON g.game_key = p_game_key
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN g2.time_primary THEN g2.completion_time END ASC NULLS LAST,
        CASE WHEN g2.time_primary THEN g2.score END ASC NULLS LAST,
        CASE WHEN NOT g2.time_primary AND lg.lower_is_better THEN g2.score END ASC NULLS LAST,
        CASE WHEN NOT g2.time_primary AND NOT lg.lower_is_better THEN g2.score END DESC NULLS LAST,
        g2.completion_time ASC NULLS LAST,
        g2.created_at ASC
    ) AS rank,
    p.player_id AS player_handle,
    g2.score,
    g2.completion_time,
    g2.difficulty,
    g2.created_at AS achieved_at
  FROM ranked g2
  JOIN games lg ON lg.game_key = p_game_key
  JOIN players p ON p.id = g2.player_id
  WHERE g2.player_rank_internal = 1
  ORDER BY rank
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ------------------------------------------------------------
-- Increment player statistics atomically
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_player_stats(
  p_player_id UUID,
  p_games_delta INTEGER,
  p_play_time_delta BIGINT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO player_stats (player_id, total_games_played, total_play_time)
  VALUES (p_player_id, GREATEST(p_games_delta, 0), GREATEST(p_play_time_delta, 0))
  ON CONFLICT (player_id) DO UPDATE
  SET
    total_games_played = player_stats.total_games_played + GREATEST(EXCLUDED.total_games_played, 0),
    total_play_time = player_stats.total_play_time + GREATEST(EXCLUDED.total_play_time, 0),
    updated_at = NOW();
$$;

-- ------------------------------------------------------------
-- Get a player's rank in a specific leaderboard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_player_rank(
  p_game_key VARCHAR,
  p_player_handle VARCHAR,
  p_difficulty VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  rank BIGINT,
  score INTEGER,
  completion_time INTEGER,
  difficulty VARCHAR,
  achieved_at TIMESTAMPTZ,
  total_players BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH leaderboard AS (
    SELECT * FROM get_leaderboard(p_game_key, p_difficulty, 1000000, 0)
  )
  SELECT
    lb.rank,
    lb.score,
    lb.completion_time,
    lb.difficulty,
    lb.achieved_at,
    (SELECT COUNT(*) FROM leaderboard) AS total_players
  FROM leaderboard lb
  WHERE lb.player_handle = p_player_handle;
$$;
