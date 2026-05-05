export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'phrase'
  | 'other'

export type LearningStatus =
  | 'new'
  | 'learning'
  | 'review'
  | 'weak'
  | 'mastered'
  | 'incomplete'
  | 'archived'

export type NewTrainingStatus =
  | 'not_started'
  | 'postponed'
  | 'queued'
  | 'in_progress'
  | 'needs_more_practice'
  | 'completed'

export type SkillType =
  | 'meaning'
  | 'reverse'
  | 'gender'
  | 'form'
  | 'spelling'
  | 'listening'

export type QuestionType =
  | 'meaning_choice'
  | 'reverse_choice'
  | 'gender_quiz'
  | 'form_quiz'
  | 'spelling'
  | 'dictation'

export type SessionType = 'new_practice' | 'review' | 'weak_practice'

export type AnswerResult = 'correct' | 'partial' | 'wrong'

export type ImportDetectedStatus =
  | 'new'
  | 'exact_duplicate'
  | 'possible_duplicate'
  | 'conflict'
  | 'incomplete'

export type ImportRecommendedAction =
  | 'add'
  | 'skip'
  | 'merge'
  | 'manual_review'
  | 'import_as_incomplete'

export type ImportFinalAction =
  | 'added'
  | 'skipped'
  | 'merged'
  | 'added_as_new'
  | 'imported_as_incomplete'
  | 'edited_then_added'
  | 'cancelled'

export type ImportBatchStatus = 'preview' | 'completed' | 'cancelled' | 'failed'

export type ImportSourceType =
  | 'paste_json'
  | 'upload_json'
  | 'backup_restore'
  | 'future_ai_image_import'

export type Gender = 'masculine' | 'feminine' | ''

// Example sentence
export interface ExampleSentence {
  fr: string
  en: string
  zh: string
}

// DB row types
export interface WordEntry {
  id: string
  user_id: string
  word: string
  display_text: string
  part_of_speech: PartOfSpeech
  english_primary: string
  english_alternatives: string[]
  chinese_primary: string
  chinese_alternatives: string[]
  ipa: string
  notes: string
  tags: string[]
  examples: ExampleSentence[]
  article_indefinite: string
  article_definite: string
  gender: Gender
  plural_form: string
  infinitive: string
  masculine_singular: string
  feminine_singular: string
  masculine_plural: string
  feminine_plural: string
  same_gender_form: boolean
  is_invariable: boolean
  canonical_key: string
  is_incomplete: boolean
  incomplete_reasons: string[]
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface LearningState {
  id: string
  user_id: string
  word_entry_id: string
  status: LearningStatus
  new_training_status: NewTrainingStatus
  show_after: string
  next_review_at: string | null
  last_reviewed_at: string | null
  overall_level: number
  new_training_attempt_count: number
  new_training_correct_count: number
  new_training_wrong_count: number
  created_at: string
  updated_at: string
}

export interface SkillScore {
  id: string
  user_id: string
  word_entry_id: string
  skill_type: SkillType
  score: number
  correct_count: number
  wrong_count: number
  partial_count: number
  last_practiced_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewLog {
  id: string
  user_id: string
  word_entry_id: string
  session_type: SessionType
  question_type: QuestionType
  skill_type: SkillType
  prompt: string
  expected_answer: string
  user_answer: string
  selected_option: string
  options: string[]
  result: AnswerResult
  was_correct: boolean
  was_partial: boolean
  created_at: string
}

export interface ImportBatch {
  id: string
  user_id: string
  schema_version: string
  language: string
  source_type: ImportSourceType
  source_title: string
  source_notes: string
  raw_json_snapshot: unknown
  total_entries: number
  new_count: number
  exact_duplicate_count: number
  possible_duplicate_count: number
  conflict_count: number
  incomplete_count: number
  merged_count: number
  skipped_count: number
  added_count: number
  status: ImportBatchStatus
  created_at: string
  completed_at: string | null
}

export interface ImportItem {
  id: string
  user_id: string
  import_batch_id: string
  raw_entry: unknown
  normalized_entry: unknown
  detected_status: ImportDetectedStatus
  matched_word_entry_id: string | null
  recommended_action: ImportRecommendedAction
  final_action: ImportFinalAction | null
  created_word_entry_id: string | null
  merged_into_word_entry_id: string | null
  issues: string[]
  created_at: string
  resolved_at: string | null
}

export interface AppSettings {
  id: string
  user_id: string
  daily_new_word_limit: number
  daily_review_limit: number
  tts_language: string
  tts_rate: number
  tts_enabled: boolean
  preferred_input_mode: 'keyboard' | 'voice'
  accent_strictness: 'lenient' | 'strict'
  created_at: string
  updated_at: string
}

// Word entry with learning state joined
export interface WordEntryWithState extends WordEntry {
  learning_state?: LearningState
  skill_scores?: SkillScore[]
}