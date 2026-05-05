import { loadReviewSession } from '@/app/actions/review'
import { ReviewClient } from './ReviewClient'

export default async function ReviewPage() {
  const { items } = await loadReviewSession()
  return <ReviewClient initialItems={items} />
}