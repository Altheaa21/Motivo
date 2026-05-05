import type { WordEntry, PartOfSpeech } from '@/types/database'

// Get the text to speak for TTS based on POS
export function getSpeakText(word: WordEntry): string {
  switch (word.part_of_speech) {
    case 'noun':
      // Speak indefinite article + noun to show gender
      if (word.article_indefinite) {
        return `${word.article_indefinite} ${word.word}`
      }
      return word.word

    case 'verb':
      return word.infinitive || word.word

    case 'adjective':
      // Brief card speaks masculine singular
      return word.masculine_singular || word.word

    case 'phrase':
      return word.word

    default:
      return word.word
  }
}

// Get all adjective forms for detail page playback
export function getAdjectiveForms(word: WordEntry): { label: string; text: string }[] {
  if (word.part_of_speech !== 'adjective') return []
  return [
    { label: 'masc. sg.', text: word.masculine_singular },
    { label: 'fém. sg.', text: word.feminine_singular },
    { label: 'masc. pl.', text: word.masculine_plural },
    { label: 'fém. pl.', text: word.feminine_plural },
  ].filter(f => f.text)
}

// Get gender label for display
export function getGenderLabel(gender: string, lang: 'en' | 'zh' = 'en'): string {
  if (lang === 'zh') {
    return gender === 'masculine' ? '阳性' : gender === 'feminine' ? '阴性' : ''
  }
  return gender === 'masculine' ? 'masculine' : gender === 'feminine' ? 'feminine' : ''
}

// Get POS label for display
export function getPosLabel(pos: PartOfSpeech, lang: 'en' | 'zh' = 'en'): string {
  const labels: Record<PartOfSpeech, { en: string; zh: string }> = {
    noun: { en: 'noun', zh: '名词' },
    verb: { en: 'verb', zh: '动词' },
    adjective: { en: 'adjective', zh: '形容词' },
    adverb: { en: 'adverb', zh: '副词' },
    preposition: { en: 'preposition', zh: '介词' },
    conjunction: { en: 'conjunction', zh: '连词' },
    phrase: { en: 'phrase', zh: '短语' },
    other: { en: 'other', zh: '其他' },
  }
  return labels[pos]?.[lang] ?? pos
}