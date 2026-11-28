import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SoundContext, useSound } from '../../src/lib/sound/sound-context.ts'
import { SoundManager } from '../../src/lib/sound/sound-manager.ts'

test('useSound hook context exists with correct default shape', () => {
  assert.ok(SoundContext, 'SoundContext should be exported')
  const defaultValue = (SoundContext as { _currentValue?: unknown })._currentValue
  assert.ok(defaultValue, 'context should have a default value')
  assert.equal(typeof (defaultValue as { play: unknown }).play, 'function')
  assert.equal((defaultValue as { muted: unknown }).muted, false)
  assert.equal((defaultValue as { volume: unknown }).volume, 1)
  assert.equal(typeof useSound, 'function', 'useSound should be a function')

  // SoundManager still works standalone
  const manager = new SoundManager()
  assert.equal(typeof manager.play, 'function')
  manager.dispose()
})