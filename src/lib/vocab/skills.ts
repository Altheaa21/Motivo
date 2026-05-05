import type { PartOfSpeech, SkillType } from '@/types/database'

const SKILLS_BY_POS: Record<PartOfSpeech, SkillType[]> = {
  noun: ['meaning', 'reverse', 'gender', 'spelling', 'listening'],
  verb: ['meaning', 'reverse', 'spelling', 'listening'],
  adjective: ['meaning', 'reverse', 'form', 'spelling', 'listening'],
  adverb: ['meaning', 'reverse', 'spelling', 'listening'],
  preposition: ['meaning', 'reverse', 'spelling', 'listening'],
  conjunction: ['meaning', 'reverse', 'spelling', 'listening'],
  phrase: ['meaning', 'reverse', 'spelling', 'listening'],
  other: ['meaning', 'reverse', 'spelling', 'listening'],
}

export function getApplicableSkills(pos: PartOfSpeech): SkillType[] {
  return SKILLS_BY_POS[pos] ?? ['meaning', 'reverse', 'spelling', 'listening']
}