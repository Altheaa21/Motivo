'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function TTSInitializer() {
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('app_settings')
        .select('tts_language, tts_rate, tts_enabled')
        .eq('user_id', user.id)
        .single()

      if (settings) {
        localStorage.setItem('tts_language', settings.tts_language ?? 'fr-FR')
        localStorage.setItem('tts_rate', String(settings.tts_rate ?? 0.9))
        localStorage.setItem('tts_enabled', String(settings.tts_enabled ?? true))
        console.log('TTS initialized:', settings)
      }
    }
    load()
  }, [])

  return null
}