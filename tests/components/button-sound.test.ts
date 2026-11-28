import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const buttonSource = readFileSync(resolve('src/components/ui/button.tsx'), 'utf-8')

test('Button plays click sound on press', () => {
  assert.ok(buttonSource.includes('useSound'), 'Button should call useSound()')
  assert.ok(buttonSource.includes("play('click')"), "Button should call play('click')")
})

test('Button does not play sound when disabled', () => {
  // The handler must guard on disabled before playing
  assert.match(
    buttonSource,
    /disabled[^\n]*play\('click'\)|play\('click'\)[\s\S]{0,200}disabled|if\s*\(?[\w.]*disabled[\s\S]{0,80}play\('click'\)/,
    'click sound should be guarded by disabled check'
  )
})