'use server'

import { createClient } from '@/lib/supabase/server'

// 左划：postpone 到明天
export async function postponeWord(wordEntryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { error } = await supabase
    .from('learning_states')
    .update({
      new_training_status: 'postponed',
      show_after: tomorrowStr,
      updated_at: new Date().toISOString(),
    })
    .eq('word_entry_id', wordEntryId)
    .eq('user_id', user.id)

  return { success: !error }
}

// 右划：加入练习队列
export async function queueWord(wordEntryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('learning_states')
    .update({
      new_training_status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('word_entry_id', wordEntryId)
    .eq('user_id', user.id)

  return { success: !error }
}

// 获取今天的 learn 队列
export async function getLearnQueue() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('word_entries')
    .select(`
      *,
      learning_states!inner (*)
    `)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .in('learning_states.status', ['new', 'learning'])
    .lte('learning_states.show_after', today)
    .not('learning_states.new_training_status', 'in', '("queued","in_progress")')
    .order('created_at')

  return data ?? []
}

// 获取已 queued 的单词数量
export async function getQueuedCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('new_training_status', 'queued')

  return count ?? 0
}