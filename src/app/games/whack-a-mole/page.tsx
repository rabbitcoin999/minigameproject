import type { Metadata } from 'next'
import { WhackAMoleGame } from '@/features/whack-a-mole/whack-a-mole-game'

export const metadata: Metadata = {
  title: 'Whack-a-Mole',
  description: 'Bop moles as they pop up in a frantic 30-second frenzy.',
}

export default function WhackAMolePage() {
  return <WhackAMoleGame />
}