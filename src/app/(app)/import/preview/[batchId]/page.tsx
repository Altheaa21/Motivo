import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ImportPreviewClient } from './ImportPreviewClient'

export default async function ImportPreviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('import_batches')
    .select('*')
    .eq('id', batchId)
    .single()

  if (!batch) notFound()

  const { data: items } = await supabase
    .from('import_items')
    .select('*')
    .eq('import_batch_id', batchId)
    .order('created_at')

  return <ImportPreviewClient batch={batch} items={items ?? []} />
}