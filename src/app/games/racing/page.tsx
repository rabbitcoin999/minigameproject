import type { Metadata } from 'next'
import { RacingGame } from '@/features/racing/racing-game'

export const metadata: Metadata = {
  title: 'Apex Racing',
  description: '3D circuit racing against three AI drivers — drift, boost and chase the fastest lap.',
}

export default function RacingPage() {
  return <RacingGame />
}
