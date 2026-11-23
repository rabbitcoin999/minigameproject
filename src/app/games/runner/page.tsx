import type { Metadata } from 'next'
import { RunnerGame } from '@/features/runner/runner-game'

export const metadata: Metadata = {
  title: 'Neon Runner',
  description: 'Dash down an endless neon track — dodge obstacles and jump barriers at full speed.',
}

export default function RunnerPage() {
  return <RunnerGame />
}