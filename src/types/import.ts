export interface ImportSource {
  type: string
  title: string
  createdAt: string
  notes: string
}

export interface ImportExample {
  fr: string
  en: string
  zh: string
}

export interface ImportEnglish {
  primary: string
  alternatives: string[]
}

export interface ImportChinese {
  primary: string
  alternatives: string[]
}

export interface ImportAdjectiveForms {
  masculineSingular: string
  feminineSingular: string
  masculinePlural: string
  femininePlural: string
  sameGenderForm: boolean
}

// Base entry fields common to all POS
export interface ImportEntryBase {
  word: string
  displayText: string
  partOfSpeech: string
  english: ImportEnglish
  chinese: ImportChinese
  ipa: string
  notes: string
  tags: string[]
  examples: ImportExample[]
}

export interface ImportNounEntry extends ImportEntryBase {
  partOfSpeech: 'noun'
  articleIndefinite: string
  articleDefinite?: string
  gender: 'masculine' | 'feminine'
  pluralForm?: string
}

export interface ImportVerbEntry extends ImportEntryBase {
  partOfSpeech: 'verb'
  infinitive: string
}

export interface ImportAdjectiveEntry extends ImportEntryBase {
  partOfSpeech: 'adjective'
  forms: ImportAdjectiveForms
}

export interface ImportInvariableEntry extends ImportEntryBase {
  partOfSpeech: 'adverb' | 'preposition' | 'conjunction'
  isInvariable: boolean
}

export interface ImportPhraseEntry extends ImportEntryBase {
  partOfSpeech: 'phrase'
  isInvariable?: boolean
}

export interface ImportOtherEntry extends ImportEntryBase {
  partOfSpeech: 'other'
}

export type ImportEntry =
  | ImportNounEntry
  | ImportVerbEntry
  | ImportAdjectiveEntry
  | ImportInvariableEntry
  | ImportPhraseEntry
  | ImportOtherEntry

export interface ImportJsonV1 {
  schemaVersion: '1.0'
  language: 'fr'
  source: ImportSource
  entries: ImportEntry[]
}

// Validation result for a single entry
export interface EntryValidationResult {
  valid: boolean
  issues: string[]
  entry: ImportEntry
}

// Normalized entry ready for duplicate detection
export interface NormalizedImportEntry {
  raw: ImportEntry
  word: string
  displayText: string
  partOfSpeech: string
  englishPrimary: string
  chinesePrimary: string
  canonicalKey: string
  isIncomplete: boolean
  incompleteReasons: string[]
  validationIssues: string[]
}