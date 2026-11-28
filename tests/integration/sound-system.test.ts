import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Integration: every consumer of the sound system must render inside the
// SoundProvider tree. layout.tsx is the single mount point — verify the
// provider wraps Navbar + children, and that every play() call site uses
// a valid SoundId.

const SOUND_IDS = new Set([
  'click', 'hover', 'start', 'pause', 'score', 'gameOver', 'levelUp', 'combo', 'error',
])

test('layout mounts SoundProvider around Navbar and main content', () => {
  const layout = readFileSync(resolve('src/app/layout.tsx'), 'utf-8')
  assert.ok(layout.includes('SoundProvider'), 'layout should import SoundProvider')
  // Provider must wrap the Navbar
  const providerIdx = layout.indexOf('<SoundProvider>')
  const navbarIdx = layout.indexOf('<Navbar')
  assert.ok(providerIdx !== -1 && navbarIdx !== -1 && providerIdx < navbarIdx, 'SoundProvider should wrap Navbar')
})

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

test('every play(<id>) call site in src uses a valid SoundId', () => {
  const files = walk('src', ['.ts', '.tsx'])
  const ids: string[] = []
  for (const f of files) {
    const src = readFileSync(f, 'utf-8')
    const matches = src.matchAll(/play\(['"]([a-zA-Z]+)['"]\)/g)
    for (const m of Array.from(matches)) ids.push(m[1])
  }
  assert.ok(ids.length > 0, 'should find play() call sites')
  for (const id of ids) {
    assert.ok(SOUND_IDS.has(id), `invalid sound id used: ${id}`)
  }
})

test('all sound modules export through the barrel', () => {
  const barrel = readFileSync(resolve('src/lib/sound/index.ts'), 'utf-8')
  for (const name of ['SoundManager', 'SoundProvider', 'useSound', 'SoundContext', 'SoundId']) {
    assert.ok(barrel.includes(name), `barrel should export ${name}`)
  }
})

test('no sound code leaks into apex-racing (excluded by spec)', () => {
  // The racing feature is separate, unmerged work: its files may not exist on
  // a clean checkout of this branch, so the exclusion check only asserts on
  // files that exist. When racing lands, its files are picked up here.
  const racingPaths = [
    'src/app/games/racing/page.tsx',
    'src/features/racing/racing-game.tsx',
    'src/features/racing/format.ts',
  ]
  const { existsSync: _e } = { existsSync }
  for (const p of racingPaths) {
    const full = resolve(p)
    if (!_e(full)) continue
    const src = readFileSync(full, 'utf-8')
    assert.ok(!src.includes('useSound'), `${p} must not import the platform sound system`)
    assert.ok(!/play\('/.test(src), `${p} must not call play()`)
  }
})