export function todayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildAiImportPrompt(date = todayStr()) {
  return `Please convert this French vocabulary note into my Import JSON Schema v1.

Use today’s date as createdAt: ${date}

Follow this prompt exactly:

You are helping me convert my French class vocabulary notes into a structured JSON import file for my personal French vocabulary app.

Your task:
Read the French vocabulary from the image/text I provide and output ONLY valid JSON following the schema below. Do not include explanations, markdown, comments, or extra text outside the JSON.

Schema rules:

Top-level JSON structure:
{
  "schemaVersion": "1.0",
  "language": "fr",
  "source": {
    "type": "manual_ai_extraction",
    "title": "French vocabulary import",
    "createdAt": "YYYY-MM-DD",
    "notes": ""
  },
  "entries": []
}

For every vocabulary entry, include these common fields:
- word: the base French word or phrase in lowercase where appropriate
- displayText: the main text shown on the flashcard, usually uppercase
- partOfSpeech: one of:
  "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "phrase", "other"
- english: object with:
  - primary: main English meaning
  - alternatives: array of alternative English meanings, or []
- chinese: object with:
  - primary: main Chinese meaning
  - alternatives: array of alternative Chinese meanings, or []
- ipa: French IPA pronunciation if reasonably certain; otherwise ""
- notes: notes if needed, otherwise ""
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
- articleDefinite: "le", "la", "l’", or "les" if known, otherwise ""
- gender: "masculine" or "feminine"
- pluralForm: plural form if known, otherwise ""

For nouns, displayText should use the indefinite article + noun, uppercase.
Example:
"UNE HABITUDE"
not "L’HABITUDE", because l’ does not show gender clearly.

Verb rules:
If partOfSpeech is "verb", include:
- infinitive: the infinitive form
Do not include full conjugation tables unless they are explicitly part of the notes.

Adjective rules:
If partOfSpeech is "adjective", include:
"forms": {
  "masculineSingular": "",
  "feminineSingular": "",
  "masculinePlural": "",
  "femininePlural": "",
  "sameGenderForm": true or false
}

For adjectives, always include masculine and feminine forms even if they are identical.
If masculine and feminine singular forms are the same, set sameGenderForm to true.

Adverb / preposition / conjunction rules:
If partOfSpeech is "adverb", "preposition", or "conjunction", include:
- isInvariable: true

Phrase rules:
If partOfSpeech is "phrase", do not add gender/forms unless clearly necessary.
Phrases should still include word, displayText, english, chinese, ipa, notes, tags, examples.

Uncertainty rules:
- Do not invent information if uncertain.
- If you are unsure about article, gender, forms, or IPA, leave the field as "" and add a note explaining the uncertainty.
- Do not guess gender for nouns if you are not confident.
- Do not guess adjective forms if you are not confident.
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
- Include all entries you can identify from the provided notes/image.`
}

export async function copyAiImportPrompt() {
  const prompt = buildAiImportPrompt()

  if (!navigator?.clipboard?.writeText) {
    throw new Error('Clipboard API is not available in this browser.')
  }

  await navigator.clipboard.writeText(prompt)
}