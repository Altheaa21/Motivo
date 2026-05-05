import { loadPracticeSession } from '@/app/actions/practice'
import { PracticeClient } from './PracticeClient'

export default async function PracticePage() {
  const { words } = await loadPracticeSession()
  return <PracticeClient initialWords={words} />
}