-- Migration 0005: add Apex Racing (3D circuit racing). Score = best lap time in ms, lower is better.
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('racing', 'Apex Racing', '3D circuit racing against three AI drivers — drift, boost and chase the fastest lap.', TRUE, TRUE, FALSE)
ON CONFLICT (game_key) DO NOTHING;
