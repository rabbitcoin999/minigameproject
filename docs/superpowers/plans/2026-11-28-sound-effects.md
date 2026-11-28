# Sound Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Web Audio API-based sound effects system to the minigame platform for UI interactions (button clicks, navigation) and game events (start, pause, score, game over) — excluding APEX Racing which has its own standalone implementation.

**Architecture:** Create a lightweight sound manager using Web Audio API for low-latency playback. Provide a React context + hook for easy access from any component. Use programmatic audio synthesis (no external audio files) to keep bundle size minimal and avoid loading delays. Sounds are synthesized on-demand using OscillatorNodes and GainNodes.

**Tech Stack:** React 18, Next.js 15, TypeScript, Web Audio API (native browser API), Tailwind CSS

**Spec:** This plan implements the sound effects system for the minigame platform.

## Global Constraints

- Exclude APEX Racing (`public/apex-racing/`) — it's a standalone Three.js game with its own audio
- No external audio files — all sounds generated programmatically via Web Audio API
- Respect `prefers-reduced-motion` for users who prefer minimal audio
- Provide a global mute toggle (persisted in localStorage)
- Sounds must be low-latency (<50ms) for responsive UI feel
- Keep total added bundle size <5KB gzipped
- All new code in `src/lib/sound/` and `src/hooks/`

## Review Focus

| Input / Condition | Expected Behavior |
|-------------------|-------------------|
| AudioContext suspended (autoplay policy) | Resume on first user interaction, queue sounds until ready |
| User enables reduced motion | All sound effects disabled |
| User toggles mute | Preference persisted, all sounds silenced |
| Rapid repeated clicks (e.g., button spam) | Sounds don't overlap excessively, slight gain reduction per repeat |
| Mobile Safari / iOS | AudioContext created on first touch, not on load |

---

### Task 1: Create Sound Manager Core

**Files:**
- Create: `src/lib/sound/sound-manager.ts`
- Create: `src/lib/sound/sound-types.ts`
- Create: `src/lib/sound/index.ts`

**Interfaces:**
- Consumes: (nothing — this is the foundation)
- Produces: `SoundManager` class with `play(soundId: SoundId)`, `setMuted(boolean)`, `setVolume(number)`, `isMuted()`, `getVolume()`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/sound/sound-manager.test.ts
import { SoundManager } from '@/lib/sound/sound-manager'

test('SoundManager initializes and can play a click sound', async () => {
  const manager = new SoundManager()
  await manager.init()
  // Should not throw
  manager.play('click')
  expect(manager.isMuted()).toBe(false)
  expect(manager.getVolume()).toBe(1.0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sound/sound-manager.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `sound-types.ts`**

Define `SoundId` type: `'click' | 'hover' | 'start' | 'pause' | 'score' | 'gameOver' | 'levelUp' | 'combo' | 'error'`

Define `SoundConfig` interface with `frequency`, `type`, `duration`, `gain`, `attack`, `release`

- [ ] **Step 4: Implement `sound-manager.ts`**

Create `SoundManager` class:
- Private `audioContext: AudioContext | null`
- Private `muted: boolean` (load from localStorage)
- Private `volume: number` (load from localStorage, default 1.0)
- Private `soundConfigs: Map<SoundId, SoundConfig>`
- `async init(): Promise<void>` — create AudioContext, resume if suspended
- `play(soundId: SoundId): void` — synthesize and play sound
- `setMuted(muted: boolean): void` — persist to localStorage
- `setVolume(volume: number): void` — persist to localStorage
- `isMuted(): boolean`
- `getVolume(): number`
- Private `ensureContext(): AudioContext` — lazy init + resume on interaction
- Private `createSound(config: SoundConfig): AudioBuffer` — generate buffer via OfflineAudioContext

- [ ] **Step 5: Implement `index.ts`**

Export `SoundManager`, `SoundId`, `SoundConfig`

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/lib/sound/sound-manager.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/sound/ tests/lib/sound/sound-manager.test.ts
git commit -m "feat(sound): add SoundManager core with programmatic synthesis"
```

---

### Task 2: Create React Context and Hook

**Files:**
- Create: `src/lib/sound/SoundProvider.tsx`
- Create: `src/hooks/useSound.ts`
- Modify: `src/app/providers.tsx` (create if not exists) or `src/app/layout.tsx`

**Interfaces:**
- Consumes: `SoundManager` from Task 1
- Produces: `SoundProvider` component, `useSound()` hook returning `{ play, muted, volume, setMuted, setVolume }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/hooks/useSound.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SoundProvider, useSound } from '@/hooks/useSound'

function TestComponent() {
  const { play } = useSound()
  return <button onClick={() => play('click')}>Click</button>
}

test('useSound hook provides play function', () => {
  render(
    <SoundProvider>
      <TestComponent />
    </SoundProvider>
  )
  fireEvent.click(screen.getByText('Click'))
  // Should not throw
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/hooks/useSound.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `SoundProvider.tsx`**

Create React Context with `SoundManager` instance
- Initialize manager on mount (call `init()`)
- Cleanup on unmount (close AudioContext)
- Provide `{ play, muted, volume, setMuted, setVolume }` to children

- [ ] **Step 4: Implement `useSound.ts`**

Create `useSound()` hook that consumes the context
- Return typed interface with all sound controls

- [ ] **Step 5: Integrate into app layout**

Modify `src/app/layout.tsx` to wrap children with `<SoundProvider>`

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/hooks/useSound.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/sound/SoundProvider.tsx src/hooks/useSound.ts src/app/layout.tsx tests/hooks/useSound.test.tsx
git commit -m "feat(sound): add SoundProvider and useSound hook"
```

---

### Task 3: Add Mute Toggle to Navbar

**Files:**
- Modify: `src/components/navigation/navbar.tsx`

**Interfaces:**
- Consumes: `useSound()` hook from Task 2
- Produces: Mute/unmute button in navbar with volume icon

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/navigation/navbar-sound.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Navbar } from '@/components/navigation/navbar'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Navbar shows mute toggle and toggles sound', () => {
  render(
    <SoundProvider>
      <Navbar />
    </SoundProvider>
  )
  const muteBtn = screen.getByLabelText(/mute/i)
  fireEvent.click(muteBtn)
  expect(muteBtn).toHaveAttribute('aria-label', /unmute/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/navigation/navbar-sound.test.tsx`
Expected: FAIL — no mute button

- [ ] **Step 3: Modify `navbar.tsx`**

- Import `useSound` hook
- Add mute/unmute button in the right section (next to login/register)
- Button shows 🔊/🔇 icon based on `muted` state
- On click, call `setMuted(!muted)`
- Add `aria-label` for accessibility

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/navigation/navbar-sound.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/navbar.tsx tests/components/navigation/navbar-sound.test.tsx
git commit -m "feat(sound): add mute toggle to navbar"
```

---

### Task 4: Add Click Sounds to Button Component

**Files:**
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `useSound()` hook
- Produces: Button plays 'click' sound on press (when not disabled)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ui/button-sound.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Button plays click sound on press', () => {
  render(
    <SoundProvider>
      <Button>Click me</Button>
    </SoundProvider>
  )
  fireEvent.click(screen.getByRole('button'))
  // Should not throw, sound plays internally
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/ui/button-sound.test.tsx`
Expected: FAIL — no sound on click

- [ ] **Step 3: Modify `button.tsx`**

- Add `useSound` hook
- Add `onClick` handler that calls `play('click')` before any existing handler
- Only play if not disabled
- Don't play on hover (that's a separate decision)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/ui/button-sound.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx tests/components/ui/button-sound.test.tsx
git commit -m "feat(sound): add click sound to Button component"
```

---

### Task 5: Add Click Sounds to GameCard and Navbar Links

**Files:**
- Modify: `src/components/games/game-card.tsx`
- Modify: `src/components/navigation/navbar.tsx` (nav links)

**Interfaces:**
- Consumes: `useSound()` hook
- Produces: 'click' sound on GameCard Play button and navbar navigation links

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/games/game-card-sound.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { GameCard } from '@/components/games/game-card'
import { SoundProvider } from '@/lib/sound/SoundProvider'

const mockGame = {
  key: 'snake' as const,
  name: 'Snake',
  description: 'Test',
  icon: '🐍',
  color: '#22c55e',
  gradient: 'from-green-500',
  path: '/games/snake',
  scoreLabel: 'Score',
  scoreUnit: 'pts',
  lowerIsBetter: false,
  hasDifficulty: false,
}

test('GameCard Play button plays click sound', () => {
  render(
    <SoundProvider>
      <GameCard game={mockGame} />
    </SoundProvider>
  )
  fireEvent.click(screen.getByText('Play'))
  // Should not throw
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/games/game-card-sound.test.tsx`
Expected: FAIL — no sound

- [ ] **Step 3: Modify `game-card.tsx`**

- Wrap the Play Link in a button or add onClick handler to play 'click' sound
- Since it's a Link, use onClick to play sound before navigation

- [ ] **Step 4: Modify `navbar.tsx` nav links**

- Add onClick to nav Link components to play 'click' sound

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/components/games/game-card-sound.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/games/game-card.tsx src/components/navigation/navbar.tsx tests/components/games/game-card-sound.test.tsx
git commit -m "feat(sound): add click sounds to GameCard and navbar links"
```

---

### Task 6: Add Game Event Sounds to Each Game

**Files:**
- Modify: `src/features/snake/snake-game.tsx`
- Modify: `src/features/2048/game2048.tsx`
- Modify: `src/features/memory/memory-game.tsx`
- Modify: `src/features/reaction/reaction-game.tsx`
- Modify: `src/features/whack-a-mole/whack-a-mole-game.tsx`
- Modify: `src/features/runner/runner-game.tsx`
- Modify: `src/features/brick-blast/brick-blast.tsx`

**Interfaces:**
- Consumes: `useSound()` hook
- Produces: Each game plays appropriate sounds:
  - `start` — on game start
  - `pause` — on pause
  - `score` — on scoring (snake eating, 2048 merge, whack-a-mole hit, etc.)
  - `gameOver` — on game over
  - `levelUp` — on level complete (brick-blast, memory)
  - `combo` — on combo (brick-blast)
  - `error` — on false start (reaction)

- [ ] **Step 1: Write the failing test (example for Snake)**

```typescript
// tests/features/snake/snake-sound.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SnakeGame } from '@/features/snake/snake-game'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Snake plays start sound on game start', async () => {
  render(
    <SoundProvider>
      <SnakeGame />
    </SoundProvider>
  )
  fireEvent.click(screen.getByText('Start Game'))
  // Sound should play internally
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/snake/snake-sound.test.tsx`
Expected: FAIL — no sound

- [ ] **Step 3: Modify each game component**

For each game:
1. Import `useSound` hook
2. Call `play('start')` in start game handler
3. Call `play('pause')` in pause handler
4. Call `play('score')` when score increases (snake eats food, 2048 merges, whack mole hit, runner distance, brick-blast brick hit)
5. Call `play('gameOver')` when game ends
6. Call `play('levelUp')` on level complete (brick-blast, memory)
7. Call `play('combo')` on combo (brick-blast)
8. Call `play('error')` on false start (reaction test)

- [ ] **Step 4: Run tests for all games**

Run: `npm test -- tests/features/`
Expected: PASS for all

- [ ] **Step 5: Commit**

```bash
git add src/features/snake/snake-game.tsx src/features/2048/game2048.tsx src/features/memory/memory-game.tsx src/features/reaction/reaction-game.tsx src/features/whack-a-mole/whack-a-mole-game.tsx src/features/runner/runner-game.tsx src/features/brick-blast/brick-blast.tsx tests/features/
git commit -m "feat(sound): add game event sounds to all games"
```

---

### Task 7: Add Hover Sounds to Interactive Elements

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/navigation/navbar.tsx`
- Modify: `src/components/games/game-card.tsx`

**Interfaces:**
- Consumes: `useSound()` hook
- Produces: Subtle 'hover' sound on mouse enter (not touch)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ui/button-hover-sound.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Button plays hover sound on mouse enter', () => {
  render(
    <SoundProvider>
      <Button>Hover me</Button>
    </SoundProvider>
  )
  fireEvent.mouseEnter(screen.getByRole('button'))
  // Should not throw
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/ui/button-hover-sound.test.tsx`
Expected: FAIL — no hover sound

- [ ] **Step 3: Modify components**

- Add `onMouseEnter` handler to play 'hover' sound (very quiet, short)
- Only on non-touch devices (check `window.matchMedia('(hover: hover)')`)
- Debounce: don't play if another hover sound played <100ms ago

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/ui/button-hover-sound.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/navigation/navbar.tsx src/components/games/game-card.tsx tests/components/ui/button-hover-sound.test.tsx
git commit -m "feat(sound): add hover sounds to interactive elements"
```

---

### Task 8: Respect Reduced Motion and Autoplay Policy

**Files:**
- Modify: `src/lib/sound/sound-manager.ts`
- Modify: `src/lib/sound/SoundProvider.tsx`

**Interfaces:**
- Consumes: Browser `prefers-reduced-motion` media query, AudioContext state
- Produces: Automatic disabling of sounds when reduced motion preferred, AudioContext resume on first user interaction

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/sound/reduced-motion.test.ts
import { SoundManager } from '@/lib/sound/sound-manager'

test('SoundManager respects prefers-reduced-motion', () => {
  // Mock matchMedia to return reduced motion preference
  // Verify play() is no-op when reduced motion is true
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/sound/reduced-motion.test.ts`
Expected: FAIL — not implemented

- [ ] **Step 3: Modify `sound-manager.ts`**

- Add `prefersReducedMotion` check in `init()`
- If true, set internal `disabled = true`
- Make `play()` no-op when disabled
- Listen for media query changes

- [ ] **Step 4: Modify `SoundProvider.tsx`**

- Add global event listener for first user interaction (click/touch/keydown)
- Call `manager.init()` on first interaction to resume AudioContext
- This handles autoplay policy

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/lib/sound/reduced-motion.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/sound/sound-manager.ts src/lib/sound/SoundProvider.tsx tests/lib/sound/reduced-motion.test.ts
git commit -m "feat(sound): respect reduced motion and autoplay policy"
```

---

### Task 9: Add Volume Control Slider (Optional Enhancement)

**Files:**
- Modify: `src/components/navigation/navbar.tsx`
- Create: `src/components/ui/volume-slider.tsx` (optional)

**Interfaces:**
- Consumes: `useSound()` hook
- Produces: Volume slider next to mute button in navbar (desktop only)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/ui/volume-slider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { VolumeSlider } from '@/components/ui/volume-slider'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Volume slider changes volume', () => {
  render(
    <SoundProvider>
      <VolumeSlider />
    </SoundProvider>
  )
  const slider = screen.getByRole('slider')
  fireEvent.change(slider, { target: { value: '0.5' } })
  expect(slider).toHaveValue('0.5')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/ui/volume-slider.test.tsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Implement `VolumeSlider` component**

- Use `useSound` hook
- Render `<input type="range" min="0" max="1" step="0.1" />`
- Bind to `volume` and `setVolume`
- Hide on mobile (use `hidden sm:block`)

- [ ] **Step 4: Add to navbar**

- Import and render next to mute button

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/components/ui/volume-slider.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/volume-slider.tsx src/components/navigation/navbar.tsx tests/components/ui/volume-slider.test.tsx
git commit -m "feat(sound): add volume slider to navbar"
```

---

### Task 10: Final Integration Test and Polish

**Files:**
- Create: `tests/integration/sound-system.test.tsx`

**Interfaces:**
- Full integration test of sound system

- [ ] **Step 1: Write integration test**

```typescript
// tests/integration/sound-system.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Navbar } from '@/components/navigation/navbar'
import { GameCard } from '@/components/games/game-card'
import { Button } from '@/components/ui/button'
import { SoundProvider } from '@/lib/sound/SoundProvider'

test('Complete sound system works end-to-end', () => {
  render(
    <SoundProvider>
      <Navbar />
      <GameCard game={mockGame} />
      <Button>Test</Button>
    </SoundProvider>
  )
  // Click navbar link
  fireEvent.click(screen.getByText('Games'))
  // Click GameCard Play
  fireEvent.click(screen.getByText('Play'))
  // Click Button
  fireEvent.click(screen.getByText('Test'))
  // Toggle mute
  fireEvent.click(screen.getByLabelText(/mute/i))
  // All should work without errors
})
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 3: Manual verification**

- Start dev server: `npm run dev`
- Test in browser: click buttons, navigate, play games
- Verify sounds play correctly
- Test mute toggle persists across reloads
- Test reduced motion preference (DevTools rendering tab)
- Test on mobile (touch events)

- [ ] **Step 4: Commit**

```bash
git add tests/integration/sound-system.test.tsx
git commit -m "test(sound): add integration test for complete sound system"
```

---

## Summary

This plan adds a complete sound effects system to the minigame platform with:

1. **Core** (`src/lib/sound/`): Web Audio API synthesis, SoundManager class
2. **React Integration** (`src/hooks/useSound.ts`, `src/lib/sound/SoundProvider.tsx`): Context + hook
3. **UI Sounds**: Button clicks, navbar links, GameCard, hover effects
4. **Game Sounds**: All 7 React games get start/pause/score/gameOver/levelUp/combo/error sounds
5. **Accessibility**: Mute toggle (persisted), volume slider, reduced motion respect, autoplay policy handling
6. **No external dependencies**: All sounds synthesized programmatically (~3KB gzipped)

**Total estimated tasks:** 10 (each independently testable)
**Excluded:** APEX Racing (`public/apex-racing/`) — standalone Three.js game