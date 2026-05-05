// Generates a dedup key for comparing entries
// Format: {normalizedWord}::{partOfSpeech}
export function generateCanonicalKey(word: string, partOfSpeech: string): string {
  const normalizedWord = word
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'") // normalize apostrophes
  return `${normalizedWord}::${partOfSpeech}`
}