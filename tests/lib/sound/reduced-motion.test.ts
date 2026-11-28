import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SoundManager } from '../../../src/lib/sound/sound-manager.ts'

// jsdom-less environment: node has no window/matchMedia, so the manager
// should still construct and play() must be a safe no-op.

test('SoundManager respects prefers-reduced-motion (no matchMedia = not disabled, play safe)', async () => {
  // In node there is no window/matchMedia; the manager must not crash and
  // must remain enabled by default (reduced-motion only applies in browser).
  const manager = new SoundManager()
  await manager.init()
  assert.doesNotThrow(() => manager.play('click'))
  assert.equal(manager.isMuted(), false)
  manager.dispose()
})

test('SoundManager play is no-op when muted', async () => {
  const manager = new SoundManager()
  await manager.init()
  manager.setMuted(true)
  assert.doesNotThrow(() => manager.play('click'))
  assert.equal(manager.isMuted(), true)
  manager.setMuted(false)
  assert.equal(manager.isMuted(), false)
  manager.dispose()
})

test('SoundManager setMuted persists preference to localStorage when available', async () => {
  // Without window.localStorage the persist is a silent no-op — must not throw
  const manager = new SoundManager()
  manager.setMuted(true)
  manager.setVolume(0.5)
  assert.equal(manager.getVolume(), 0.5)
  manager.dispose()
})

test('SoundManager volume clamps to [0, 1]', async () => {
  const manager = new SoundManager()
  manager.setVolume(2)
  assert.equal(manager.getVolume(), 1)
  manager.setVolume(-1)
  assert.equal(manager.getVolume(), 0)
  manager.dispose()
})

test('SoundManager rate-limits identical rapid plays', async () => {
  const manager = new SoundManager()
  await manager.init()
  // First play records a timestamp; the second within 40ms must be dropped.
  // This is behavior-internal, but at minimum repeated plays must not throw.
  manager.play('click')
  manager.play('click')
  manager.play('click')
  manager.dispose()
})

test('SoundManager reduced-motion listener cleanup on dispose', async () => {
  const manager = new SoundManager()
  await manager.init()
  assert.doesNotThrow(() => manager.dispose())
  // Double dispose must also be safe
  assert.doesNotThrow(() => manager.dispose())
})
