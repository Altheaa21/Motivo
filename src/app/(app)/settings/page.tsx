import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('id', user!.id)
    .single()

  return <SettingsClient settings={settings} profile={profile} />
}