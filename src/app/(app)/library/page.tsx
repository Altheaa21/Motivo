import { createClient } from '@/lib/supabase/server'
import { LibraryClient } from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('word_entries')
    .select(`
      *,
      learning_states (*)
    `)
    .eq('user_id', user!.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  return <LibraryClient entries={entries ?? []} />
}