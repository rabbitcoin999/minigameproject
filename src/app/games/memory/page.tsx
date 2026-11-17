import type { Metadata } from 'next'
import { MemoryGame } from '@/features/memory/memory-game'

export const metadata: Metadata = {
  title: 'Memory Game',
  description: 'Flip cards and find all matching pairs as fast as you can.',
}

export default function MemoryPage() {
  return <MemoryGame />
}
