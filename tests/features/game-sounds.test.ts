import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GAMES: Array<[string, string, string[]]> = [
  // [path, label, required sound ids]
  ['src/features/snake/snake-game.tsx', 'snake', ['start', 'score', 'gameOver', 'pause']],
  ['src/features/2048/game2048.tsx', '2048', ['score', 'gameOver']],
  ['src/features/memory/memory-game.tsx', 'memory', ['start', 'levelUp']],
  ['src/features/reaction/reaction-game.tsx', 'reaction', ['start', 'score', 'error']],
  ['src/features/whack-a-mole/whack-a-mole-game.tsx', 'whack-a-mole', ['start', 'score', 'gameOver']],
  ['src/features/runner/runner-game.tsx', 'runner', ['start', 'gameOver', 'pause']],
  ['src/features/brick-blast/brick-blast.tsx', 'brick-blast', ['start', 'score', 'gameOver', 'levelUp', 'combo', 'pause']],
]

for (const [path, label, required] of GAMES) {
  test(`${label}: integrates useSound and plays required event sounds`, () => {
    const source = readFileSync(resolve(path), 'utf-8')
    assert.ok(source.includes('useSound'), `${label} should call useSound()`)
    for (const soundId of required) {
      assert.ok(
        source.includes(`play('${soundId}')`),
        `${label} should call play('${soundId}')`
      )
    }
  })
}