-- Migration 0004: add Brick Blast (Breakout-style game)
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('brick-blast', 'Brick Blast', 'Classic Breakout-style game — bounce the ball to destroy all bricks!', TRUE, FALSE, FALSE)
ON CONFLICT (game_key) DO NOTHING;