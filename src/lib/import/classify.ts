import type { WordEntry } from '@/types/database'
import type { NormalizedImportEntry } from '@/types/import'
import type {
  ImportDetectedStatus,
  ImportRecommendedAction,
} from '@/types/database'
import { normalizeWord, stripAccents } from '@/lib/vocab/normalize'

// Safe cast helper
function asRecord(entry: unknown): Record<string, unknown> {
  return entry as Record<string, unknown>
}

export interface ClassifiedEntry {
  normalized: NormalizedImportEntry
  detectedStatus: ImportDetectedStatus
  recommendedAction: ImportRecommendedAction
  matchedWordEntry: WordEntry | null
  issues: string[]
}

// ── Similarity helpers ────────────────────────────────────────────

function sameWord(a: string, b: string): boolean {
  return normalizeWord(a) === normalizeWord(b)
}

function similarWord(a: string, b: string): boolean {
  return stripAccents(normalizeWord(a)) === stripAccents(normalizeWord(b))
}

function sameMeaning(a: NormalizedImportEntry, b: WordEntry): boolean {
  const aEn = a.englishPrimary.toLowerCase().trim()
  const bEn = b.english_primary.toLowerCase().trim()
  return aEn === bEn
}

function overlappingMeaning(a: NormalizedImportEntry, b: WordEntry): boolean {
  const aEn = a.englishPrimary.toLowerCase().trim()
  const bEn = b.english_primary.toLowerCase().trim()
  const bAlts = b.english_alternatives.map(s => s.toLowerCase().trim())
  const rawEntry = asRecord(a.raw)
  const aEnglish = rawEntry.english as Record<string, unknown> | undefined
  const aAlts = ((aEnglish?.alternatives as string[]) ?? []).map(s => s.toLowerCase().trim())

  return (
    aEn === bEn ||
    bAlts.includes(aEn) ||
    aAlts.includes(bEn) ||
    aAlts.some(alt => bAlts.includes(alt))
  )
}

function sameGender(a: NormalizedImportEntry, b: WordEntry): boolean {
  const rawEntry = asRecord(a.raw)
  return rawEntry.gender === b.gender
}

function sameAdjectiveForms(a: NormalizedImportEntry, b: WordEntry): boolean {
  const rawEntry = asRecord(a.raw)
  const forms = rawEntry.forms as Record<string, unknown> | undefined
  if (!forms) return false
  return (
    forms.masculineSingular === b.masculine_singular &&
    forms.feminineSingular === b.feminine_singular
  )
}

// ── New content detection ─────────────────────────────────────────

function hasNewContent(a: NormalizedImportEntry, b: WordEntry): boolean {
  const rawEntry = asRecord(a.raw)
  const aEnglish = rawEntry.english as Record<string, unknown> | undefined
  const aChinese = rawEntry.chinese as Record<string, unknown> | undefined

  const hasNewIpa = rawEntry.ipa && !b.ipa
  const hasNewNotes = rawEntry.notes && !b.notes
  const hasNewExamples =
    Array.isArray(rawEntry.examples) && rawEntry.examples.length > 0 && b.examples.length === 0
  const hasNewAltEn =
    Array.isArray(aEnglish?.alternatives) &&
    (aEnglish!.alternatives as string[]).some(
      alt => !b.english_alternatives.includes(alt)
    )
  const hasNewAltZh =
    Array.isArray(aChinese?.alternatives) &&
    (aChinese!.alternatives as string[]).some(
      alt => !b.chinese_alternatives.includes(alt)
    )

  return !!(hasNewIpa || hasNewNotes || hasNewExamples || hasNewAltEn || hasNewAltZh)
}

// ── Main classifier ───────────────────────────────────────────────

export function classifyEntry(
  normalized: NormalizedImportEntry,
  existingEntries: WordEntry[]
): ClassifiedEntry {
  if (normalized.isIncomplete) {
    return {
      normalized,
      detectedStatus: 'incomplete',
      recommendedAction: 'import_as_incomplete',
      matchedWordEntry: null,
      issues: normalized.incompleteReasons,
    }
  }

  const pos = normalized.partOfSpeech

  const candidates = existingEntries.filter(
    e =>
      e.archived_at === null &&
      e.part_of_speech === pos &&
      (sameWord(normalized.word, e.word) || similarWord(normalized.word, e.word))
  )

  if (candidates.length === 0) {
    return {
      normalized,
      detectedStatus: 'new',
      recommendedAction: 'add',
      matchedWordEntry: null,
      issues: [],
    }
  }

  for (const existing of candidates) {
    const wordMatch = sameWord(normalized.word, existing.word)
    const meaningMatch = sameMeaning(normalized, existing)

    // ── Noun ──
    if (pos === 'noun') {
      if (wordMatch && meaningMatch) {
        if (!sameGender(normalized, existing)) {
          return {
            normalized,
            detectedStatus: 'conflict',
            recommendedAction: 'manual_review',
            matchedWordEntry: existing,
            issues: ['Gender conflict: existing entry has different gender'],
          }
        }
        if (!hasNewContent(normalized, existing)) {
          return {
            normalized,
            detectedStatus: 'exact_duplicate',
            recommendedAction: 'skip',
            matchedWordEntry: existing,
            issues: [],
          }
        }
        return {
          normalized,
          detectedStatus: 'possible_duplicate',
          recommendedAction: 'merge',
          matchedWordEntry: existing,
          issues: [],
        }
      }
      if (wordMatch && !meaningMatch) {
        return {
          normalized,
          detectedStatus: 'conflict',
          recommendedAction: 'manual_review',
          matchedWordEntry: existing,
          issues: ['Same word with different primary meaning — may be a different entry'],
        }
      }
    }

    // ── Adjective ──
    if (pos === 'adjective') {
      if (wordMatch && meaningMatch) {
        const rawEntry = asRecord(normalized.raw)
        const forms = rawEntry.forms as Record<string, unknown> | undefined
        if (forms && !sameAdjectiveForms(normalized, existing)) {
          return {
            normalized,
            detectedStatus: 'conflict',
            recommendedAction: 'manual_review',
            matchedWordEntry: existing,
            issues: ['Adjective form conflict: forms differ from existing entry'],
          }
        }
        if (!hasNewContent(normalized, existing)) {
          return {
            normalized,
            detectedStatus: 'exact_duplicate',
            recommendedAction: 'skip',
            matchedWordEntry: existing,
            issues: [],
          }
        }
        return {
          normalized,
          detectedStatus: 'possible_duplicate',
          recommendedAction: 'merge',
          matchedWordEntry: existing,
          issues: [],
        }
      }
    }

    // ── Verb ──
    if (pos === 'verb') {
      const rawEntry = asRecord(normalized.raw)
      const sameInfinitive = rawEntry.infinitive === existing.infinitive
      if (wordMatch && sameInfinitive) {
        if (meaningMatch && !hasNewContent(normalized, existing)) {
          return {
            normalized,
            detectedStatus: 'exact_duplicate',
            recommendedAction: 'skip',
            matchedWordEntry: existing,
            issues: [],
          }
        }
        return {
          normalized,
          detectedStatus: 'possible_duplicate',
          recommendedAction: 'merge',
          matchedWordEntry: existing,
          issues: [],
        }
      }
    }

    // ── Generic ──
    if (wordMatch) {
      if (meaningMatch && !hasNewContent(normalized, existing)) {
        return {
          normalized,
          detectedStatus: 'exact_duplicate',
          recommendedAction: 'skip',
          matchedWordEntry: existing,
          issues: [],
        }
      }
      if (overlappingMeaning(normalized, existing)) {
        return {
          normalized,
          detectedStatus: 'possible_duplicate',
          recommendedAction: 'merge',
          matchedWordEntry: existing,
          issues: [],
        }
      }
      return {
        normalized,
        detectedStatus: 'conflict',
        recommendedAction: 'manual_review',
        matchedWordEntry: existing,
        issues: ['Same word with different meaning — manual review required'],
      }
    }

    if (similarWord(normalized.word, existing.word)) {
      return {
        normalized,
        detectedStatus: 'possible_duplicate',
        recommendedAction: 'merge',
        matchedWordEntry: existing,
        issues: ['Similar word found (possible accent difference)'],
      }
    }
  }

  return {
    normalized,
    detectedStatus: 'new',
    recommendedAction: 'add',
    matchedWordEntry: null,
    issues: [],
  }
}

export function classifyAll(
  normalizedEntries: NormalizedImportEntry[],
  existingEntries: WordEntry[]
): ClassifiedEntry[] {
  return normalizedEntries.map(entry => classifyEntry(entry, existingEntries))
}

export interface ClassificationSummary {
  total: number
  newCount: number
  exactDuplicateCount: number
  possibleDuplicateCount: number
  conflictCount: number
  incompleteCount: number
}

export function summarizeClassification(classified: ClassifiedEntry[]): ClassificationSummary {
  return {
    total: classified.length,
    newCount: classified.filter(c => c.detectedStatus === 'new').length,
    exactDuplicateCount: classified.filter(c => c.detectedStatus === 'exact_duplicate').length,
    possibleDuplicateCount: classified.filter(c => c.detectedStatus === 'possible_duplicate').length,
    conflictCount: classified.filter(c => c.detectedStatus === 'conflict').length,
    incompleteCount: classified.filter(c => c.detectedStatus === 'incomplete').length,
  }
}