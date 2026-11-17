import type { Metadata } from 'next'
import { SnakeGame } from '@/features/snake/snake-game'

export const metadata: Metadata = {
  title: 'Snake',
  description: 'Classic snake game — eat food, grow longer, avoid hitting walls and yourself.',
}

export default function SnakePage() {
  return <SnakeGame />
}
