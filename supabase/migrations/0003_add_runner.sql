-- Migration 0003: add Neon Runner (3D endless runner)
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('runner', 'Neon Runner', 'Dash down an endless neon track — dodge obstacles and jump barriers at full speed.', TRUE, FALSE, FALSE)
ON CONFLICT (game_key) DO NOTHING;