import type { Metadata } from 'next'
import { TankFightGame } from '@/features/tank-fight/tank-fight-game'

export const metadata: Metadata = {
  title: 'Tank Fight',
  description: 'Top-down arcade tank battle — survive waves of enemy tanks!',
}

export default function TankFightPage() {
  return <TankFightGame />
}