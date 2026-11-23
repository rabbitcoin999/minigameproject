import type { Metadata } from 'next'
import { BrickBlastGame } from '@/features/brick-blast/brick-blast'

export const metadata: Metadata = {
  title: 'Brick Blast',
  description: 'Classic Breakout-style game — bounce the ball to destroy all bricks!',
}

export default function BrickBlastPage() {
  return <BrickBlastGame />
}