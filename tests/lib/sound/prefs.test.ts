import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SoundManager } from '../../../src/lib/sound/sound-manager.ts'

/**
 * Hydration safety (review finding C1): the SoundManager is constructed
 * during the provider's first client render. If the constructor reads
 * localStorage, stored preferences leak into the hydration render and
 * desync it from the server HTML (muted users get a fatal hydration error).
 * Construction must be side-effect free; stored prefs load via refreshPrefs().
 */

test('SoundManager construction is pure — stored prefs load only via refreshPrefs()', () => {
  const fakeStorage = {
    store: new Map([['sound-muted', 'true']]),
    getItem(k: string) {
      return this.store.get(k) ?? null
    },
    setItem(k: string, v: string) {
      this.store.set(k, v)
    },
  }
  const origWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = {
    localStorage: fakeStorage,
    // no matchMedia: reduced-motion check must be skipped safely
  }
  try {
    const manager = new SoundManager()
    assert.equal(
      manager.isMuted(),
      false,
      'constructor must not read stored preferences (hydration safety)'
    )
    manager.refreshPrefs()
    assert.equal(
      manager.isMuted(),
      true,
      'refreshPrefs() must load the stored muted preference'
    )
    manager.dispose()
  } finally {
    ;(globalThis as { window?: unknown }).window = origWindow
  }
})

test('refreshPrefs loads persisted volume too', () => {
  const fakeStorage = {
    store: new Map([['sound-volume', '0.4']]),
    getItem(k: string) {
      return this.store.get(k) ?? null
    },
    setItem(k: string, v: string) {
      this.store.set(k, v)
    },
  }
  const origWindow = (globalThis as { window?: unknown }).window
  ;(globalThis as { window?: unknown }).window = { localStorage: fakeStorage }
  try {
    const manager = new SoundManager()
    assert.equal(manager.getVolume(), 1, 'constructor must not read stored volume')
    manager.refreshPrefs()
    assert.equal(manager.getVolume(), 0.4, 'refreshPrefs() must load stored volume')
    manager.dispose()
  } finally {
    ;(globalThis as { window?: unknown }).window = origWindow
  }
})
