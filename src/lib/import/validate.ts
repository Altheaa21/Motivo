import type { ImportJsonV1, ImportEntry, NormalizedImportEntry } from '@/types/import'
import { normalizeWord } from '@/lib/vocab/normalize'
import { generateCanonicalKey } from '@/lib/vocab/canonical'

// ── Top-level JSON validation ──────────────────────────────────────

export interface ParseResult {
  success: boolean
  data?: ImportJsonV1
  error?: string
}

export function parseImportJson(raw: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { success: false, error: 'Invalid JSON. Please check the format.' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { success: false, error: 'JSON must be an object.' }
  }

  const obj = parsed as Record<string, unknown>

  if (obj.schemaVersion !== '1.0') {
    return { success: false, error: `Unsupported schema version: ${obj.schemaVersion}. Expected "1.0".` }
  }

  if (obj.language !== 'fr') {
    return { success: false, error: `Unsupported language: ${obj.language}. Expected "fr".` }
  }

  if (!Array.isArray(obj.entries)) {
    return { success: false, error: 'Missing or invalid "entries" array.' }
  }

  if (obj.entries.length === 0) {
    return { success: false, error: 'No entries found in the import file.' }
  }

  return { success: true, data: parsed as ImportJsonV1 }
}

// ── Per-entry validation ───────────────────────────────────────────

const VALID_POS = new Set([
  'noun', 'verb', 'adjective', 'adverb',
  'preposition', 'conjunction', 'phrase', 'other',
])

function validateCommonFields(entry: Record<string, unknown>): string[] {
  const issues: string[] = []

  if (!entry.word || typeof entry.word !== 'string' || !entry.word.trim()) {
    issues.push('Missing required field: word')
  }
  if (!entry.displayText || typeof entry.displayText !== 'string') {
    issues.push('Missing required field: displayText')
  }
  if (!entry.partOfSpeech || !VALID_POS.has(entry.partOfSpeech as string)) {
    issues.push(`Invalid or missing partOfSpeech: ${entry.partOfSpeech}`)
  }

  const english = entry.english as Record<string, unknown> | undefined
  if (!english?.primary || typeof english.primary !== 'string' || !english.primary.trim()) {
    issues.push('Missing required field: english.primary')
  }

  const chinese = entry.chinese as Record<string, unknown> | undefined
  if (!chinese?.primary || typeof chinese.primary !== 'string' || !chinese.primary.trim()) {
    issues.push('Missing required field: chinese.primary')
  }

  return issues
}

function validateNounFields(entry: Record<string, unknown>): string[] {
  const issues: string[] = []

  if (!entry.articleIndefinite || !['un', 'une'].includes(entry.articleIndefinite as string)) {
    issues.push('Noun missing articleIndefinite (expected "un" or "une")')
  }
  if (!entry.gender || !['masculine', 'feminine'].includes(entry.gender as string)) {
    issues.push('Noun missing gender (expected "masculine" or "feminine")')
  }

  return issues
}

function validateVerbFields(entry: Record<string, unknown>): string[] {
  const issues: string[] = []

  if (!entry.infinitive || typeof entry.infinitive !== 'string' || !entry.infinitive.trim()) {
    issues.push('Verb missing infinitive')
  }

  return issues
}

function validateAdjectiveFields(entry: Record<string, unknown>): string[] {
  const issues: string[] = []
  const forms = entry.forms as Record<string, unknown> | undefined

  if (!forms) {
    issues.push('Adjective missing forms object')
    return issues
  }

  const required = ['masculineSingular', 'feminineSingular', 'masculinePlural', 'femininePlural']
  for (const field of required) {
    if (!forms[field] || typeof forms[field] !== 'string') {
      issues.push(`Adjective missing forms.${field}`)
    }
  }

  if (typeof forms.sameGenderForm !== 'boolean') {
    issues.push('Adjective missing forms.sameGenderForm (boolean)')
  }

  return issues
}

function validateInvariableFields(entry: Record<string, unknown>): string[] {
  const issues: string[] = []

  if (typeof entry.isInvariable !== 'boolean') {
    issues.push(`${entry.partOfSpeech} missing isInvariable (boolean)`)
  }

  return issues
}

export interface EntryValidation {
  issues: string[]
  isIncomplete: boolean
  incompleteReasons: string[]
}

export function validateEntry(rawEntry: unknown): EntryValidation {
  const entry = rawEntry as Record<string, unknown>
  const commonIssues = validateCommonFields(entry)

  // If common fields are broken, can't proceed with POS-specific checks
  if (commonIssues.some(i => i.includes('word') || i.includes('partOfSpeech'))) {
    return {
      issues: commonIssues,
      isIncomplete: true,
      incompleteReasons: commonIssues,
    }
  }

  let posIssues: string[] = []
  const pos = entry.partOfSpeech as string

  if (pos === 'noun') posIssues = validateNounFields(entry)
  else if (pos === 'verb') posIssues = validateVerbFields(entry)
  else if (pos === 'adjective') posIssues = validateAdjectiveFields(entry)
  else if (['adverb', 'preposition', 'conjunction'].includes(pos)) {
    posIssues = validateInvariableFields(entry)
  }

  const allIssues = [...commonIssues, ...posIssues]
  const isIncomplete = allIssues.length > 0

  return {
    issues: allIssues,
    isIncomplete,
    incompleteReasons: allIssues,
  }
}

// ── Normalize entry into flat structure ───────────────────────────

export function normalizeEntry(rawEntry: unknown): NormalizedImportEntry {
  const entry = rawEntry as Record<string, unknown>
  const validation = validateEntry(entry)

  const word = normalizeWord((entry.word as string) ?? '')
  const pos = (entry.partOfSpeech as string) ?? 'other'
  const canonicalKey = generateCanonicalKey(word, pos)

  const english = entry.english as Record<string, unknown> | undefined
  const chinese = entry.chinese as Record<string, unknown> | undefined

  return {
    raw: rawEntry as ImportEntry,
    word,
    displayText: (entry.displayText as string) ?? '',
    partOfSpeech: pos,
    englishPrimary: (english?.primary as string) ?? '',
    chinesePrimary: (chinese?.primary as string) ?? '',
    canonicalKey,
    isIncomplete: validation.isIncomplete,
    incompleteReasons: validation.incompleteReasons,
    validationIssues: validation.issues,
  }
}

// ── Validate and normalize all entries ────────────────────────────

export interface ValidationSummary {
  total: number
  validCount: number
  incompleteCount: number
  normalized: NormalizedImportEntry[]
}

export function validateAndNormalizeAll(data: ImportJsonV1): ValidationSummary {
  const normalized = data.entries.map(normalizeEntry)

  return {
    total: normalized.length,
    validCount: normalized.filter(e => !e.isIncomplete).length,
    incompleteCount: normalized.filter(e => e.isIncomplete).length,
    normalized,
  }
}