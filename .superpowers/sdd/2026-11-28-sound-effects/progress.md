# SDD ledger — plan: docs/superpowers/plans/2026-11-28-sound-effects.md

Pre-flight: no shared interfaces (all tasks consume from Tasks 1-2 only)

Task 1: Ruling: plan's test runner (jest-style `npm test -- <file>`) doesn't exist in this repo; repo uses `node --experimental-strip-types --test <file>` with node:test+assert. Also `@/` path alias doesn't resolve in node ESM, so tests import via relative paths. — Chose node's built-in test runner to match the existing zero-dependency test setup — if a later task needs different runner support, tests must use node:test.

Task 1: complete (commits c59c441, tests: node --experimental-strip-types --test tests/lib/sound/sound-manager.test.ts → 1 pass, 0 fail)

Task 2: Ruling: node --experimental-strip-types can't handle .tsx files, so SoundProvider.tsx (JSX) can't be imported by node tests. Split into sound-context.ts (pure context + useSound hook, testable) and SoundProvider.tsx (JSX provider only). Tests import sound-context.ts. — Keeps zero-dep node test runner working; cost: one extra file, imports split between two modules.

Task 2: Ruling: pre-existing tsc errors in src/features/brick-blast/logic.test.ts (GAME_WIDTH etc. not exported from physics) — verified pre-existing via git stash; not caused by this work; left alone.

Task 2: complete (commits 78d0fe2, tests: node --experimental-strip-types --test tests/hooks/useSound.test.ts tests/lib/sound/sound-manager.test.ts → 2 pass, 0 fail)

Task 3: Ruling: plan's test rendered Navbar with @testing-library/react, which isn't installed (zero-dep repo). Test verifies navbar source structurally (useSound usage, aria-label, setMuted call) instead. — Keeps repo dependency-free; cost: structural test is weaker than behavioral, but the mute toggle's logic lives in SoundManager (unit-tested) and SoundContext (default no-ops).

Task 3: complete (commits c697f08, tests: node --experimental-strip-types --test tests/components/navbar-sound.test.ts → 2 pass, 0 fail)

Task 4: Ruling: same as Task 3 — structural source test instead of @testing-library render (library not installed). Behavior itself is one line (play('click') guard disabled); SoundManager logic is unit-tested.

Task 4: complete (commits 86ad745, tests: node --experimental-strip-types --test tests/components/button-sound.test.ts → 2 pass, 0 fail)

Task 5: complete (commits 9f9474b, tests: node --experimental-strip-types --test tests/components/game-card-sound.test.ts → 2 pass, 0 fail)

Task 6: Ruling: plan called play('score') for reaction's "go" cue too; implemented as play('score') when screen turns green (the go cue) — the round-result click plays no sound, matching the plan's intent. Whack-a-mole bonus moles play both 'score' then 'combo'. Full suite (node tests + run-tests.mjs) green: 15 + 51 pass.

Task 6: complete (commits 5b9baae, tests: node --experimental-strip-types --test tests/features/game-sounds.test.ts → 7 pass, 0 fail; full suites green)

Task 7: Ruling: plan wanted debounced hover sounds with (hover: hover) media query check; implemented as shared useHoverSound hook in src/lib/sound/hover-sound.ts with 100ms cooldown, used by Button, navbar links, GameCard Play.

Task 7: complete (commits 40152b7, tests: node --experimental-strip-types --test tests/components/hover-sound.test.ts → 2 pass, 0 fail)

Task 8: Ruling: reduced-motion + autoplay policy were already implemented in Task 1's SoundManager (matchMedia listener, resume-on-play, gesture unlock in SoundProvider). Task 8's deliverable became the regression tests proving those behaviors (6 tests, all passing in node where matchMedia/AudioContext are absent — safe no-ops verified). Plan's SoundProvider listener code already existed from Task 2.

Task 8: complete (commits a8d0235, tests: node --experimental-strip-types --test tests/lib/sound/reduced-motion.test.ts → 6 pass, 0 fail)

Task 9: complete (commits f9e5f9a, tests: node --experimental-strip-types --test tests/components/volume-slider.test.ts → 3 pass, 0 fail)

Task 10: complete (commits f1eef97, tests: node --experimental-strip-types --test tests/ → 30 pass, 0 fail; tests/run-tests.mjs → 51 pass, 0 fail)

Post-tasks: next build found 4 react-hooks/exhaustive-deps warnings (play missing from dep arrays in snake, brick-blast x2, whack-a-mole). Fixed by adding play (a stable useCallback from provider) to the dep arrays. Commit 1cfe71a. Full suites re-run green. Production build exits 0.