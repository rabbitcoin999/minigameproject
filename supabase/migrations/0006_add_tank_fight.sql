-- Migration 0006: add Tank Fight (top-down arcade tank battle). Score = points, higher is better.
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('tank-fight', 'Tank Fight', 'Top-down arcade tank battle — survive waves of enemy tanks!', TRUE, FALSE, FALSE)
ON CONFLICT (game_key) DO NOTHING;