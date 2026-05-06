import { getPracticeStats } from '@/app/actions/practice-session'
import { PracticeHub } from './PracticeHub'

export default async function PracticePage() {
  const stats = await getPracticeStats()
  return <PracticeHub stats={stats} />
}