import { createClient } from '@/lib/supabase/server'
import { LearnClient } from './LearnClient'

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('word_entries')
    .select(`
      *,
      learning_states!inner (*)
    `)
    .eq('user_id', user!.id)
    .is('archived_at', null)
    .in('learning_states.status', ['new', 'learning'])
    .lte('learning_states.show_after', today)
    .not('learning_states.new_training_status', 'in', '("queued","in_progress")')
    .order('created_at')

  const { count: queuedCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .in('new_training_status', ['queued', 'in_progress'])

  return (
    <LearnClient
      entries={entries ?? []}
      initialQueuedCount={queuedCount ?? 0}
    />
  )
}