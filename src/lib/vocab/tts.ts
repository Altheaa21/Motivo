import type { WordEntry } from '@/types/database'
import { getSpeakText } from './display'

function getSettings() {
  if (typeof window === 'undefined') return {
    lang: 'fr-FR', rate: 0.9, enabled: true
  }
  return {
    lang: localStorage.getItem('tts_language') ?? 'fr-FR',
    rate: parseFloat(localStorage.getItem('tts_rate') ?? '0.9'),
    enabled: localStorage.getItem('tts_enabled') !== 'false',
  }
}

export function speak(text: string): void {
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  const { lang, rate, enabled } = getSettings()
  if (!enabled) return

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate

  const voices = window.speechSynthesis.getVoices()
  const frVoice =
    voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith('fr-')) ||
    voices.find(v => v.lang.startsWith('fr'))

  if (frVoice) utterance.voice = frVoice

  window.speechSynthesis.speak(utterance)
}

export function speakWord(word: WordEntry): void {
  speak(getSpeakText(word))
}

export function speakSentence(sentence: string): void {
  speak(sentence)
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return
  window.speechSynthesis?.cancel()
}

export function hasFrenchVoice(): boolean {
  if (typeof window === 'undefined') return false
  const voices = window.speechSynthesis?.getVoices() ?? []
  return voices.some(v => v.lang.startsWith('fr'))
}

export function initTTS(_settings: {
  tts_language: string
  tts_rate: number
  tts_enabled: boolean
}) {}