import type { Metadata } from 'next'
import { Game2048 } from '@/features/2048/game2048'

export const metadata: Metadata = {
  title: '2048',
  description: 'Slide and merge numbered tiles to reach the legendary 2048 tile.',
}

export default function Page2048() {
  return <Game2048 />
}
