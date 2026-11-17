-- ============================================================
-- Migration 0001: Initial schema for mini-games platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Table: players
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     VARCHAR(20) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT players_player_id_format CHECK (
    player_id ~ '^[a-zA-Z0-9_]{3,20}$'
  )
);

-- Unique (case-insensitive) player IDs: store a lowercase copy
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_id_lower VARCHAR(20) GENERATED ALWAYS AS (LOWER(player_id)) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS players_player_id_lower_idx ON players (player_id_lower);

-- ------------------------------------------------------------
-- Table: games
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key    VARCHAR(50) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  lower_is_better BOOLEAN NOT NULL DEFAULT FALSE,
  has_difficulty BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Table: game_scores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  completion_time INTEGER,
  difficulty      VARCHAR(10),
  play_duration_ms BIGINT,
  session_id      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT game_scores_difficulty_check CHECK (difficulty IN ('easy','medium','hard')),
  CONSTRAINT game_scores_score_check CHECK (score >= 0 AND score <= 10000000)
);

-- Indexes for leaderboards and history lookups
CREATE INDEX IF NOT EXISTS idx_game_scores_game_score ON game_scores (game_id, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_game_scores_player_game ON game_scores (player_id, game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_difficulty_score ON game_scores (game_id, difficulty, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_completion ON game_scores (game_id, completion_time ASC, score DESC) WHERE completion_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_scores_game_completion_diff ON game_scores (game_id, difficulty, completion_time ASC, score DESC) WHERE completion_time IS NOT NULL;

-- ------------------------------------------------------------
-- Table: player_stats
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_stats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  total_games_played  INTEGER NOT NULL DEFAULT 0,
  total_play_time     BIGINT NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats (player_id);

-- ------------------------------------------------------------
-- Table: game_sessions (server-issued gameplay sessions for anti-cheat)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_game ON game_sessions (player_id, game_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_expires ON game_sessions (expires_at);

-- ------------------------------------------------------------
-- Prepopulate games
-- ------------------------------------------------------------
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('snake', 'Snake', 'Classic snake game — eat food, grow longer, avoid hitting walls and yourself.', TRUE, FALSE, FALSE),
  ('2048', '2048', 'Slide and merge numbered tiles to reach the legendary 2048 tile.', TRUE, FALSE, FALSE),
  ('memory', 'Memory Game', 'Flip cards and find all matching pairs as fast as you can.', TRUE, TRUE, TRUE),
  ('reaction', 'Reaction Test', 'Test your reflexes — click the moment the screen turns green.', TRUE, TRUE, FALSE),
  ('whack-a-mole', 'Whack-a-Mole', 'Bop moles as they pop up in a frantic 30-second frenzy.', TRUE, FALSE, FALSE)
ON CONFLICT (game_key) DO NOTHING;

-- ------------------------------------------------------------
-- Row Level Security (RLS)
-- The app uses the anon key server-side only; RLS adds defense in depth
-- so no client can read password hashes or other players' private data.
-- ------------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Deny all direct access by default (no policies created = no access via anon key).
-- The server uses the service role key or explicit security definer functions.
-- For this setup we use a dedicated Postgres role with limited grants via service key.

-- Prevent anyone (even service role from client) from selecting password_hash
CREATE OR REPLACE VIEW safe_players AS
  SELECT id, player_id, created_at, updated_at FROM players;

-- ------------------------------------------------------------
-- Function: update updated_at automatically
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
