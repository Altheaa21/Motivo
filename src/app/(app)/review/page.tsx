import { loadReviewSession } from '@/app/actions/review'
import { ReviewClient } from './ReviewClient'
import { createClient } from '@/lib/supabase/server'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { items } = await loadReviewSession()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('accent_strictness')
    .eq('user_id', user!.id)
    .single()

  const accentStrictness = (settings?.accent_strictness ?? 'lenient') as 'lenient' | 'strict'

  return <ReviewClient initialItems={items} accentStrictness={accentStrictness} />
}