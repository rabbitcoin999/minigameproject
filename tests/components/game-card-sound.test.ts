import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const gameCardSource = readFileSync(resolve('src/components/games/game-card.tsx'), 'utf-8')
const navbarSource = readFileSync(resolve('src/components/navigation/navbar.tsx'), 'utf-8')

test('GameCard Play button plays click sound', () => {
  assert.ok(gameCardSource.includes('useSound'), 'GameCard should call useSound()')
  assert.ok(gameCardSource.includes("play('click')"), "GameCard Play link should call play('click')")
})

test('Navbar nav links play click sound', () => {
  // navLinks map should wire a click sound into Link clicks
  assert.ok(navbarSource.includes("play('click')"), 'navbar links should call play(\'click\')')
})