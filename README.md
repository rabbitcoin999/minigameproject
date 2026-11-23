# MiniGames Platform

A complete online mini-games platform where players register with a **Player ID + password** (no email), play five classic games, save scores automatically, and compete on global leaderboards.

## Features

- 🎮 **Six fully playable games**: Snake, 2048, Memory Game, Reaction Test, Whack-a-Mole, Neon Runner
- 🔐 **Custom Player ID authentication** — no email or Google account required
- 🏆 **Global leaderboards** per game, with difficulty splits for Memory
- 📊 **Player profiles & statistics** — personal bests, play counts, recent history
- 🛡️ **Security-first**: Argon2-grade password hashing (bcrypt), HTTP-only session cookies, rate limiting, server-side score validation & anti-cheat
- 📱 **Responsive dark-themed UI** for desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API routes (server-side) |
| Database | PostgreSQL (via Supabase) |
| Auth | Custom session layer (jose JWT in HTTP-only cookies) + bcryptjs |
| Deployment | Vercel |

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (Dashboard → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** service-role key (bypasses RLS, server-only — never expose to browser) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL (for any future client-side queries) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (browser-safe; RLS protects data) |
| `SESSION_SECRET` | Random string for signing session cookies — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXT_PUBLIC_APP_URL` | App URL, e.g. `http://localhost:3000` |

> **Critical:** `.env` is git-ignored. **Never commit real secrets.** The `SUPABASE_SERVICE_ROLE_KEY` does **not** start with `NEXT_PUBLIC_` so it is automatically stripped from client bundles by Next.js. It is used exclusively by the API routes (`src/lib/database/supabase.ts` creates the admin client with this key).

### 4. Apply database migrations

Open the Supabase Dashboard → **SQL Editor** and run the migration files in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_leaderboard_functions.sql`

Or with the Supabase CLI:

```bash
supabase db push
```

The migrations create:
- `players`, `games`, `game_scores`, `player_stats`, `game_sessions` tables
- Prepopulated 5 games in the `games` table
- Indexes for leaderboard and history queries
- **Row Level Security (RLS) enabled on all tables with no public policies** — the publishable key cannot read/write directly; all data access goes through API routes using the service key
- Leaderboard RPC functions (`get_leaderboard`, `get_player_rank`, `increment_player_stats`)

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Build for production

```bash
npm run build
npm start
```

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add the environment variables from `.env.example` in **Project → Settings → Environment Variables** (use your production Supabase credentials and a fresh `SESSION_SECRET`).
4. Run the SQL migrations against your production Supabase project.
5. Deploy. Vercel detects Next.js automatically.

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Home, games, leaderboard, login, register
│   ├── (protected)/       # Profile, statistics (login required)
│   ├── games/             # The five game pages
│   └── api/               # REST API (auth, scores, leaderboard, players)
├── components/            # Shared UI (layout, navigation, cards, buttons)
├── features/              # One folder per game + auth (logic + UI separated)
│   ├── snake/logic.ts     # Pure game logic, no React
│   └── snake/snake-game.tsx
├── lib/
│   ├── auth/              # Password hashing, sessions, rate limiting
│   ├── database/          # Supabase client + queries
│   ├── validation/        # Zod schemas + score rules (anti-cheat)
│   └── api/               # Consistent API responses
├── config/games.ts        # Central game registry (single source of truth)
└── types/
supabase/migrations/       # SQL migrations
tests/                     # Pure logic unit tests (run with `npm test`)
```

---

## ⚠️ CRITICAL GOTCHAS — READ BEFORE MODIFYING

### 1. Tailwind content paths must include `src/features/`

**Why:** All five game UIs live in `src/features/<game>/`. If you add a new game there and forget to add `src/features/**` to `tailwind.config.ts` → `content`, **none of its CSS classes will be generated** and the game will render as invisible/broken divs.

```typescript
// tailwind.config.ts
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  './src/features/**/*.{js,ts,jsx,tsx,mdx}',  // ← REQUIRED
],
```

### 2. Database writes MUST use the service key (never the publishable key)

The migrations enable **Row Level Security with NO public policies**. This means:
- The publishable key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) **cannot INSERT/UPDATE/DELETE** any table
- All database writes happen in API routes via `getSupabaseAdmin()` which uses `SUPABASE_SERVICE_ROLE_KEY`
- Never import `getSupabaseAdmin` into a client component — the secret key would leak to the browser bundle

### 3. Score validation runs server-side — every game needs rules

When you add a game, you **must** add a `ScoreRule` entry in `src/lib/validation/score-rules.ts`. The validation function `validateScoreRules()` rejects submissions that exceed plausible bounds (max score, min/max completion time, moves-per-duration sanity, etc.). Without rules, your game's scores will be silently rejected with `SCORE_REJECTED`.

Key properties per game:
```typescript
{
  maxScore: number,                    // hard ceiling
  minDurationPerPoint?: number,        // time-per-point sanity (e.g. 100ms per snake food)
  requiresCompletionTime?: boolean,    // true for memory/reaction
  requiresDifficulty?: boolean,        // true for memory
  minCompletionTime?: number,          // impossible-fast detection
  maxCompletionTime?: number,          // impossibly-slow cap
}
```

### 4. Leaderboard ranking is NOT always "higher score wins"

The `games` table has `lower_is_better` and `has_difficulty` columns. The leaderboard RPC (`get_leaderboard`) handles:
- **Score-primary** (Snake, 2048, Whack-a-Mole): `score DESC`, tie-break `created_at ASC`
- **Time-primary** (Memory): `completion_time ASC`, tie-break `score ASC` (moves)
- **Time-primary** (Reaction): `score ASC` (average ms), no completion_time
- **Difficulty splits**: Memory has separate leaderboards per difficulty (enforced by `has_difficulty = true`)

When adding a game, set these correctly in the `games` table insert (see migration 0001).

### 5. `isNewPersonalBest` logic differs by ranking direction

In `src/lib/database/scores.ts`, the function queries the game's `lower_is_better` flag and computes:
```typescript
isNewPersonalBest = previousBest === null
  ? true
  : (lowerIsBetter ? newScore < previousBest : newScore > previousBest)
```
If you forget this, the first submission of a "lower is better" game will never show "new record".

### 6. Dev server can wedge if you start it multiple times

If you run `npm run dev` while another dev server is still holding port 3000, the new process becomes an orphan child, spins 100% CPU, and stops responding. **Always kill the old process first:**

```bash
# Windows
netstat -ano | findstr ":3000"
taskkill /PID <pid> /F

# Or just use the terminal you started it in and Ctrl+C
```

### 7. Auth sessions are HTTP-only cookies — no localStorage

The session JWT lives in a cookie (`mgp_session`), HttpOnly, SameSite=Lax, Secure in production. Client code **cannot** read it via `document.cookie`. The `useAuth` hook calls `/api/auth/me` to hydrate the user.

---

## Adding a New Game — Complete Checklist

The platform is designed so adding a game touches **5 files** and **1 SQL row**. No auth, profile, or leaderboard code changes required.

### Step 0: Plan the game's scoring & ranking

Answer these before coding:
| Question | Example (Snake) | Example (Memory) |
| --- | --- | --- |
| What is the "score" field? | Food collected × 10 | Move count (lower = better) |
| Does it have `completion_time`? | No | Yes (milliseconds, lower = better) |
| Does it have difficulty levels? | No | Yes (easy/medium/hard) |
| Is lower better? | No | Yes (time) |
| What are plausible bounds? | max 10,000 pts, min 100ms per food | 4-12 moves, 2s–1h time |

### Step 1: Create pure logic (`src/features/<game>/logic.ts`)

- **Zero React dependencies** — export pure functions/types
- Testable with `npm test` (see `tests/run-tests.mjs`)
- Export: `createInitialState()`, `tick()`, `move()`, `hasValidMoves()`, constants, types

### Step 2: Create UI component (`src/features/<game>/<game>-game.tsx`)

- `'use client'`
- Import logic from Step 1
- Handle input (keyboard/touch)
- Use `useAuth()` + `useScoreSubmit()` for score saving
- Display `phase` states: idle → playing → paused/result → over
- Show personal best, progress, controls

### Step 3: Create page (`src/app/games/<game>/page.tsx`)

```tsx
import type { Metadata } from 'next'
import { <Game>Game } from '@/features/<game>/<game>-game'

export const metadata: Metadata = {
  title: '<Game>',
  description: '...'
}

export default function <Game>Page() {
  return <<Game>Game />
}
```

### Step 4: Register in central registry (`src/config/games.ts`)

```typescript
// Add to GAMES array:
{
  key: '<game>',
  name: '<Display Name>',
  description: '...',
  icon: '🎮',
  color: '#hex',
  gradient: 'from-... to-...',
  path: '/games/<game>',
  scoreLabel: 'Score',      // or 'Time'
  scoreUnit: 'pts',         // or 'ms', 's'
  lowerIsBetter: false,     // true for memory/reaction
  hasDifficulty: false,     // true for memory
}

// Also add to GAME_KEYS (auto-generated) and DIFFICULTIES if needed
```

The **games page, leaderboard tabs, navigation, and API routes** all read from this registry — no hardcoded lists anywhere.

### Step 5: Add score validation rules (`src/lib/validation/score-rules.ts`)

```typescript
'<game>': {
  maxScore: 10000,
  minDurationPerPoint: 100,        // ms per point (optional)
  requiresCompletionTime: false,   // true for timed games
  requiresDifficulty: false,       // true if difficulty required
  minCompletionTime: 1000,         // ms
  maxCompletionTime: 3600000,      // ms
  description: '...',
},
```

If the game has special logic (e.g. memory needs `score >= pairCount`), add a custom check in `validateScoreRules()`.

### Step 6: Insert row in `games` table (SQL migration)

Create `supabase/migrations/0003_add_<game>.sql`:

```sql
INSERT INTO games (game_key, name, description, is_active, lower_is_better, has_difficulty) VALUES
  ('<game>', '<Game Name>', 'Description...', TRUE, FALSE, FALSE)
ON CONFLICT (game_key) DO NOTHING;
```

Run it in Supabase SQL Editor. **Set `lower_is_better` and `has_difficulty` correctly** — the leaderboard RPC uses them.

### Step 7: Test end-to-end

```bash
npm run dev
# 1. Register/login
# 2. Play the game → verify score saves, "new personal best" appears
# 3. Check leaderboard → verify ranking order (asc vs desc)
# 4. Run `npm test` → logic tests pass
# 5. Run `npm run build` → compiles without errors
```

---

## Common Pitfalls When Adding Games

| Symptom | Likely Cause |
| --- | --- |
| Game UI invisible / no colors / zero-size divs | Forgot `src/features/**` in `tailwind.config.ts` content |
| Score submission returns `SCORE_REJECTED` | Missing/incorrect `ScoreRule` in `score-rules.ts` |
| `isNewPersonalBest` never shows for first play | `lowerIsBetter` flag wrong in `games` table or logic |
| Memory leaderboard ranks by moves, not time | `time_primary` logic in `get_leaderboard` not triggered |
| Reaction game won't start | Outer element is `<button disabled>` swallowing clicks (use `<div role="button">`) |
| Whack-a-Mole score not saved at time-up | Game-over effect checks wrong phase (use ref guard) |
| Dev server hangs / 100% CPU | Multiple `npm run dev` processes on same port |

---

## API Reference (Quick)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | ❌ | Create account (playerId, password, confirmPassword) |
| POST | `/api/auth/login` | ❌ | Log in (playerId, password) |
| POST | `/api/auth/logout` | ✅ | Clear session cookie |
| GET | `/api/auth/me` | ✅ | Current user |
| POST | `/api/scores` | ✅ | Submit score (gameKey, score, completionTime?, difficulty?, durationMs?, sessionToken?) |
| GET | `/api/scores/history` | ✅ | Paginated history (?game=, ?limit=, ?offset=) |
| GET | `/api/scores/personal-best` | ✅ | All PBs or one (?game=, ?difficulty=) |
| GET | `/api/leaderboard/[game]` | ❌ | Top 100 (?difficulty=, ?page=, ?pageSize=) |
| GET | `/api/leaderboard/[game]/me` | ✅ | Your rank on board |
| GET/PATCH | `/api/players/me` | ✅ | Profile / rename |
| GET | `/api/players/me/statistics` | ✅ | Aggregate stats |
| POST | `/api/games/[game]/session` | ✅ | Server-issued gameplay session token (anti-cheat) |

---

## Testing

```bash
npm run lint          # ESLint
npx tsc --noEmit      # Type checking
npm test              # Pure logic unit tests (23 tests)
```

Game logic modules (`features/*/logic.ts`) are pure functions — unit test with any runner.

---

## Session Flow (for debugging)

1. `POST /api/auth/login` → server verifies bcrypt hash → creates JWT with `{playerId, playerHandle, exp}` → signs with `SESSION_SECRET` → sets `mgp_session` cookie (HttpOnly, SameSite=Lax, Secure in prod)
2. Browser sends cookie automatically on every request
3. `useAuth()` hook calls `GET /api/auth/me` → server verifies JWT → returns `{player: {id, playerId, createdAt}}`
4. `POST /api/scores` → server reads session via `getSession()` → validates input + score rules → inserts with service key

---

## Where Secrets Live

| Secret | Used In | Never In |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/database/supabase.ts` (`getSupabaseAdmin`) | Client components, `.next/`, Vercel build logs (use Vercel env vars) |
| `SESSION_SECRET` | `src/lib/auth/session.ts` | Client components, `.next/` |
| `bcrypt` password hash | Database (`players.password_hash`) | Logs, API responses, client |

---

## Extending the Platform (from PLAN.md §15)

The architecture supports:
- Unlimited new games (follow checklist above)
- Player achievements, XP/leveling, daily challenges
- Multiplayer, friends, tournaments, seasonal leaderboards
- Game categories/tags, admin game management
- **All without modifying auth, profiles, score storage, or leaderboard core**

---

**Happy coding!** If you hit a wall, check `PLAN.md` for the original requirements, and this README for the implementation reality. The most common time-sinks are the Tailwind content path and the score validation rules — verify those first.