import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const buttonSource = readFileSync(resolve('src/components/ui/button.tsx'), 'utf-8')
const navbarSource = readFileSync(resolve('src/components/navigation/navbar.tsx'), 'utf-8')
const gameCardSource = readFileSync(resolve('src/components/games/game-card.tsx'), 'utf-8')

test('hover sound helper exists with hover-capability check and debounce', () => {
  // The shared helper should check (hover: hover) so touch devices never hover-sound
  const helperSource = readFileSync(resolve('src/lib/sound/hover-sound.ts'), 'utf-8')
  assert.ok(helperSource.includes('(hover: hover)'), 'helper should check hover capability')
  assert.ok(/debounce|lastPlayed|cooldown|HOVER_COOLDOWN/i.test(helperSource), 'helper should debounce repeated hovers')
})

test('Button, navbar links and GameCard play hover sound via the helper', () => {
  for (const [name, source] of [['button', buttonSource], ['navbar', navbarSource], ['game-card', gameCardSource]] as const) {
    assert.ok(
      source.includes('useHoverSound'),
      `${name} should use the shared useHoverSound helper`
    )
  }
})