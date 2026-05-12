import type { WordEntry, PartOfSpeech } from '@/types/database'

// 自动生成显示文本（用于卡片正面、Library列表等）
// 名词：article_indefinite + word（大写）
// 动词：infinitive（大写）
// 其他：word（大写）
export function getDisplayText(word: WordEntry): string {
  const clean = cleanWord(word.word)
  switch (word.part_of_speech) {
    case 'noun':
      if (word.article_indefinite) {
        return `${word.article_indefinite} ${clean}`.toUpperCase()
      }
      return clean.toUpperCase()
    case 'verb':
      return (word.infinitive || clean).toUpperCase()
    default:
      return clean.toUpperCase()
  }
}

// 清理 word 字段里可能带的冠词前缀（处理历史数据）
export function cleanWord(word: string): string {
  return word
    .split('/')[0]
    .trim()
    .replace(/^l['']/, '')
    .replace(/^le /, '')
    .replace(/^la /, '')
    .replace(/^les /, '')
    .replace(/^un /, '')
    .replace(/^une /, '')
    .trim()
}

// Get the text to speak for TTS based on POS
export function getSpeakText(word: WordEntry): string {
  const clean = cleanWord(word.word)
  switch (word.part_of_speech) {
    case 'noun':
      if (word.article_indefinite) {
        return `${word.article_indefinite} ${clean}`
      }
      return clean
    case 'verb':
      return word.infinitive || clean
    case 'adjective':
      return word.masculine_singular || clean
    case 'phrase':
      return word.word
    default:
      return clean
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