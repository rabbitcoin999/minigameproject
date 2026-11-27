import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SoundManager } from '../../../src/lib/sound/sound-manager.ts'

test('SoundManager initializes and can play a click sound', async () => {
  const manager = new SoundManager()
  await manager.init()
  // Should not throw
  manager.play('click')
  assert.equal(manager.isMuted(), false)
  assert.equal(manager.getVolume(), 1.0)
})