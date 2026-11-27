import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sliderSource = readFileSync(resolve('src/components/ui/volume-slider.tsx'), 'utf-8')
const navbarSource = readFileSync(resolve('src/components/navigation/navbar.tsx'), 'utf-8')

test('VolumeSlider renders a range input bound to useSound volume', () => {
  assert.ok(sliderSource.includes('useSound'), 'VolumeSlider should call useSound()')
  assert.ok(sliderSource.includes('type="range"'), 'should render a range input')
  assert.ok(sliderSource.includes('setVolume'), 'should call setVolume')
  assert.ok(sliderSource.includes('volume'), 'should read volume')
  assert.ok(sliderSource.includes('aria-label'), 'slider should have an aria-label')
})

test('VolumeSlider is desktop-only (hidden on mobile)', () => {
  assert.ok(sliderSource.includes('hidden') && /sm:block|md:block/.test(sliderSource), 'slider should hide on small screens')
})

test('Navbar renders the VolumeSlider', () => {
  assert.ok(navbarSource.includes('VolumeSlider'), 'navbar should render VolumeSlider')
})