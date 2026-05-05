// Normalize user input before comparison
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
}

// Normalize a French word for canonical comparison
export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
}

// Strip accents for lenient comparison
export function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Check if two strings differ only in accents
export function differsByAccentOnly(a: string, b: string): boolean {
  return stripAccents(a) === stripAccents(b) && a !== b
}