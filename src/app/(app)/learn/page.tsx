import { createClient } from '@/lib/supabase/server'
import { LearnClient } from './LearnClient'

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 读取每日新词上限
  const { data: settings } = await supabase
    .from('app_settings')
    .select('daily_new_word_limit')
    .eq('user_id', user!.id)
    .single()

  const dailyLimit = settings?.daily_new_word_limit ?? 10

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
    .limit(dailyLimit)  // 每日新词上限

  const { count: queuedCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .in('new_training_status', ['queued', 'in_progress'])

  // return (
  //   <LearnClient
  //     entries={entries ?? []}
  //     initialQueuedCount={queuedCount ?? 0}
  //   />
  // )
  
  const shuffled = [...(entries ?? [])].sort(() => Math.random() - 0.5)

  return (
    <LearnClient
      entries={shuffled}
      initialQueuedCount={queuedCount ?? 0}
    />
  )
}