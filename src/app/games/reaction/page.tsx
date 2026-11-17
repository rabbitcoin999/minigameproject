import type { Metadata } from 'next'
import { ReactionGame } from '@/features/reaction/reaction-game'

export const metadata: Metadata = {
  title: 'Reaction Test',
  description: 'Test your reflexes — click the moment the screen turns green.',
}

export default function ReactionPage() {
  return <ReactionGame />
}
