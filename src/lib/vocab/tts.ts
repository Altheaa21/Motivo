import type { WordEntry } from '@/types/database'
import { getSpeakText } from './display'

let currentUtterance: SpeechSynthesisUtterance | null = null

export function speak(text: string, lang = 'fr-FR', rate = 0.9): void {
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  // Cancel current
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate

  // Try to find French voice
  const voices = window.speechSynthesis.getVoices()
  const frVoice =
    voices.find(v => v.lang === 'fr-FR') ||
    voices.find(v => v.lang === 'fr-CA') ||
    voices.find(v => v.lang.startsWith('fr'))

  if (frVoice) {
    utterance.voice = frVoice
  }

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function speakWord(word: WordEntry, lang = 'fr-FR', rate = 0.9): void {
  const text = getSpeakText(word)
  speak(text, lang, rate)
}

export function speakSentence(sentence: string, lang = 'fr-FR', rate = 0.9): void {
  speak(sentence, lang, rate)
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