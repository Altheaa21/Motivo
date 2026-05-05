import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WordDetailClient } from './WordDetailClient'

export default async function WordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entry } = await supabase
    .from('word_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!entry) notFound()

  const { data: state } = await supabase
    .from('learning_states')
    .select('*')
    .eq('word_entry_id', id)
    .single()

  const { data: skills } = await supabase
    .from('skill_scores')
    .select('*')
    .eq('word_entry_id', id)

  return <WordDetailClient entry={entry} state={state} skills={skills ?? []} />
}