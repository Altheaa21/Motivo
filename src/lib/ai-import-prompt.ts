export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildAiImportPrompt(date = todayStr()): string {
  return `You are helping me convert my French class vocabulary notes into a structured JSON import file for my personal French vocabulary app.

Your task:
Read the French vocabulary from the image/text I provide and output ONLY valid JSON following the schema below. Do not include explanations, markdown, comments, or extra text outside the JSON.

CRITICAL RULE — One word per entry:
Each entry must represent exactly ONE word or fixed phrase.
Do NOT use slashes to combine multiple forms in the word field.
For example:
- WRONG: "word": "notre / nos"
- CORRECT: make two entries, one for "notre" and one for "nos"
OR if only the main form is needed:
- CORRECT: "word": "notre", with notes explaining "nos" is the plural form

For possessive adjectives, subject pronouns, and similar paradigm words:
- Either create one entry per form
- Or create one entry for the most important form, and describe the other forms in the notes field
- Never put multiple forms separated by slashes in the word field or displayText field unless it is a fixed idiomatic phrase where both parts always appear together

Schema rules:

Top-level JSON structure:
{
  "schemaVersion": "1.0",
  "language": "fr",
  "source": {
    "type": "manual_ai_extraction",
    "title": "French vocabulary import",
    "createdAt": "${date}",
    "notes": ""
  },
  "entries": []
}

For every vocabulary entry, include these common fields:
- word: the base French word or phrase in lowercase — MUST be a single word or fixed phrase, never multiple forms separated by slashes
- displayText: the main text shown on the flashcard, usually uppercase — MUST also be a single form, not "MON / MA / MES"
- partOfSpeech: one of:
  "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "other"
- english: object with:
  - primary: main English meaning
  - alternatives: array of alternative English meanings, or []
- chinese: object with:
  - primary: main Chinese meaning
  - alternatives: array of alternative Chinese meanings, or []
- ipa: French IPA pronunciation if reasonably certain; otherwise ""
- notes: use this field to explain related forms, usage rules, paradigm information. For example: "Plural form: nos. Use notre before singular nouns, nos before plural nouns."
- tags: array of tags, or []
- examples: array of example objects, or []
  Each example object must be:
  {
    "fr": "",
    "en": "",
    "zh": ""
  }

Noun rules:
If partOfSpeech is "noun", include:
- articleIndefinite: "un" or "une"
- articleDefinite: "le", "la", "l'", or "les" if known, otherwise ""
- gender: "masculine" or "feminine"
- pluralForm: plural form if known, otherwise ""

For nouns, displayText should use the indefinite article + noun, uppercase.
Example: "UNE HABITUDE" not "L'HABITUDE", because l' does not show gender clearly.

Verb rules:
If partOfSpeech is "verb", include:
- infinitive: the infinitive form
Do not include full conjugation tables unless they are explicitly part of the notes.
Individual conjugated forms (je suis, tu es, etc.) should be entered as separate "phrase" entries if needed.

Adjective rules:
If partOfSpeech is "adjective", include:
"forms": {
  "masculineSingular": "",
  "feminineSingular": "",
  "masculinePlural": "",
  "femininePlural": "",
  "sameGenderForm": true or false
}
Always include masculine and feminine forms even if identical.
If masculine and feminine singular are the same, set sameGenderForm to true.
Do NOT use slashes in form fields — each field must contain exactly one form.

Adverb / preposition / conjunction rules:
If partOfSpeech is "adverb", "preposition", or "conjunction", include:
- isInvariable: true

Phrase rules:
If partOfSpeech is "phrase", do not add gender/forms unless clearly necessary.
Fixed expressions like "au printemps", "c'est", "je suis" are phrases.
Phrases should still include word, displayText, english, chinese, ipa, notes, tags, examples.
The word field for a phrase should be the full fixed expression in lowercase, e.g. "au printemps".

Possessive adjectives and similar paradigm words:
Words like mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs are paradigm sets.
For each set, you have two options:
Option A — One entry per form:
  Create separate entries for "mon", "ma", "mes" etc.
  Each entry has its own word, displayText, and notes.
Option B — One entry for the main form:
  Create one entry using the most common or base form (e.g. "mon" for masculine singular).
  In the notes field, explain: "Feminine singular: ma. Plural: mes."
  The word field must still be just "mon", not "mon / ma / mes".
Choose whichever option best represents the vocabulary from the notes. If the notes list all forms explicitly, Option A is preferred.

Subject pronouns:
Enter each pronoun as a separate entry with partOfSpeech "other".
Do not combine "il / elle" into a single entry.
Create one entry for "il" and one entry for "elle".

Uncertainty rules:
- Do not invent information if uncertain.
- If you are unsure about article, gender, forms, or IPA, leave the field as "" and add a note.
- Do not guess gender for nouns if not confident.
- Do not guess adjective forms if not confident.
- However, if the word is common and you are confident, fill in the missing grammar information.

Translation rules:
- Always provide both English and Chinese meanings.
- Keep primary meanings short and suitable for flashcards.
- Put extra meanings in alternatives.
- Do not make primary meanings too long.

Example rules:
- Add 0–2 short example sentences per entry.
- Examples should be simple and appropriate for a beginner French learner.
- Each example must include French, English, and Chinese.
- If you cannot provide a reliable example, use [].

Output requirements:
- Output ONLY valid JSON.
- Do not wrap the JSON in markdown.
- Do not include comments.
- Do not include trailing commas.
- Use double quotes for all JSON keys and string values.
- Make sure the JSON can be parsed directly.
- Include all entries you can identify from the provided notes/image.
- Each entry must have exactly one word in the word field — no slashes combining multiple forms.`
}