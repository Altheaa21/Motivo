import { createClient } from '@/lib/supabase/server'
import { TodayClient } from './TodayClient'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 新词/学习中 待学
  const { count: newCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .in('status', ['new', 'learning'])
    .lte('show_after', today)
    .not('new_training_status', 'in', '("queued","in_progress")')

  // 已加入队列待练习
  const { count: queuedCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .in('new_training_status', ['queued', 'in_progress'])

  // 待复习
  const { count: reviewCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .in('status', ['review', 'weak', 'mastered'])
    .lte('next_review_at', today)

  // 薄弱词
  const { count: weakCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('status', 'weak')

  // 不完整词条
  const { count: incompleteCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('status', 'incomplete')

  // 总词数
  const { count: totalCount } = await supabase
    .from('word_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .is('archived_at', null)

  // 已掌握
  const { count: masteredCount } = await supabase
    .from('learning_states')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('status', 'mastered')

  // 获取用户名
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user!.id)
    .single()

  return (
    <TodayClient
      newCount={newCount ?? 0}
      queuedCount={queuedCount ?? 0}
      reviewCount={reviewCount ?? 0}
      weakCount={weakCount ?? 0}
      incompleteCount={incompleteCount ?? 0}
      totalCount={totalCount ?? 0}
      masteredCount={masteredCount ?? 0}
      displayName={profile?.display_name || profile?.email || ''}
    />
  )
}