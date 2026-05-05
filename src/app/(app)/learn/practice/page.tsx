import { loadPracticeSession } from '@/app/actions/practice'
import { PracticeClient } from './PracticeClient'
import { createClient } from '@/lib/supabase/server'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { words } = await loadPracticeSession()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('accent_strictness')
    .eq('user_id', user!.id)
    .single()

  const accentStrictness = (settings?.accent_strictness ?? 'lenient') as 'lenient' | 'strict'

  return <PracticeClient initialWords={words} accentStrictness={accentStrictness} />
}