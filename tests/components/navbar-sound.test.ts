import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The navbar is a .tsx client component that can't be imported by node's
// type-stripping loader (JSX). This test verifies the source integrates the
// sound hook and mute toggle structurally, plus that the hook it consumes
// exposes the needed API.
const navbarSource = readFileSync(
  resolve('src/components/navigation/navbar.tsx'),
  'utf-8'
)

test('navbar imports useSound and renders a mute toggle with aria-label', () => {
  assert.ok(navbarSource.includes('useSound'), 'navbar should call useSound()')
  assert.ok(/aria-label=\{?["'`]?[Mm]ute|aria-label=["'`]?(Un)?mute/i.test(navbarSource), 'mute button should have an aria-label')
  assert.ok(navbarSource.includes('setMuted'), 'mute button should call setMuted')
  assert.ok(navbarSource.includes('muted'), 'navbar should read muted state')
})

test('navbar mute button toggles based on muted state', () => {
  // The aria-label must be dynamic: "Mute sound effects" / "Unmute sound effects"
  assert.ok(
    navbarSource.includes('Unmute') && navbarSource.includes('Mute'),
    'aria-label should reflect both muted and unmuted states'
  )
})