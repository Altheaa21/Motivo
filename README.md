# Motivo — Personal French Vocabulary App

Motivo is a personal French vocabulary learning app built with **Next.js**, **React**, and **Supabase**.

It is designed for self-use: I can convert handwritten French class notes into structured JSON with AI, import the vocabulary into the app, and then study new words through card-based learning, practice questions, and spaced review.

## Features

- **AI JSON import**
  - Paste AI-generated vocabulary JSON into the app.
  - Validate entries before importing.
  - Preview duplicates, conflicts, and incomplete entries before saving.

- **Personal vocabulary library**
  - Store French words, English meanings, Chinese meanings, IPA, examples, tags, and grammar fields.
  - Support nouns, verbs, adjectives, adverbs, prepositions, conjunctions, phrases, and other entries.
  - Track gender, articles, adjective forms, verb infinitives, and invariable words.

- **New word learning**
  - New words appear as study cards.
  - Swipe or use actions to postpone words or queue them for practice.
  - Right swipe does not mean “learned”; it only moves the word into the training queue.

- **Practice and review**
  - New words are tested with meaning, reverse, gender/form, spelling, and listening-style exercises.
  - Old words use spaced review logic.
  - Review question type is selected based on weak skills.

- **Skill tracking**
  - Tracks separate skills such as meaning, reverse recall, gender, form, spelling, and listening.
  - Answers are judged as `correct`, `partial`, or `wrong`.

- **Text-to-speech**
  - Uses browser/system speech synthesis for French pronunciation.
  - Nouns are read with article + noun, such as `une habitude`.
  - Designed to use available French system voices.

- **Cloud sync**
  - Supabase stores vocabulary, learning states, skill scores, review logs, imports, and settings.
  - The same account can be used across MacBook, iPad, and iPhone.

- **Backup and export**
  - Export full backup JSON.
  - Export vocabulary-only JSON.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** CSS variables / inline styles / responsive card-based UI
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth
- **Deployment:** Vercel
- **Mobile plan:** PWA first, optional Capacitor wrapper for iOS/iPadOS

## App Structure

Main pages:

- `/today` — daily dashboard
- `/learn` — new word cards
- `/learn/practice` — new word practice
- `/review` — spaced review
- `/library` — vocabulary library
- `/import` — JSON import
- `/import/preview/[batchId]` — import preview
- `/settings` — learning settings, TTS settings, backup/export

## Import JSON Workflow

The app expects vocabulary imports to follow **Import JSON Schema v1**.

The general workflow is:

1. Take a photo of French class vocabulary notes.
2. Ask AI to convert the notes into Import JSON Schema v1.
3. Paste the JSON into the Import page.
4. Preview the import.
5. Resolve duplicates, conflicts, or incomplete entries.
6. Confirm import.
7. Study the new words in Learn and Review.

The app includes a copyable AI prompt in the Import and Settings pages so the generated JSON uses the correct schema and today’s date.

## Learning Logic

### New Words

New words are not manually marked as known.

A new word goes through this flow:

```text
new
→ queued for practice
→ new practice questions
→ review if passed
→ learning if failed
````

Right swipe means:

```text
I have seen this word and want to practice it.
```

It does **not** mean the word is mastered.

### Review

Review uses skill-based weighted random selection.

Each word has skill scores from 0 to 5. Lower scores are more likely to be tested.

```text
weight = 6 - skillScore
```

Example skills:

* meaning
* reverse
* gender
* form
* spelling
* listening

## Supabase Data Model

Core tables:

* `profiles`
* `word_entries`
* `learning_states`
* `skill_scores`
* `review_logs`
* `import_batches`
* `import_items`
* `app_settings`

All user-owned data is scoped by `user_id`.

Row Level Security should restrict access so each user can only access their own rows.

## Environment Variables

Create a `.env.local` file for local development.

Required variables usually include:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Depending on the implementation, additional Supabase server-side variables may be required.

Do not commit `.env.local` to GitHub.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

During development, useful routes include:

```text
http://localhost:3000/today
http://localhost:3000/import
http://localhost:3000/library
http://localhost:3000/learn
http://localhost:3000/review
http://localhost:3000/settings
```

## Build

Before deployment, run:

```bash
npm run build
```

If the build passes locally, the app is ready to deploy to Vercel.

## Deployment

The app is intended to be deployed to **Vercel**.

Deployment flow:

1. Push the project to GitHub.
2. Import the GitHub repo into Vercel.
3. Add required environment variables in Vercel.
4. Deploy.
5. Test login, import, library, learning, review, TTS, and settings.

## Mobile Usage

The recommended mobile setup is:

1. Deploy the app to Vercel.
2. Open the Vercel URL on iPhone or iPad.
3. Add it to the Home Screen as a PWA.

Optional later setup:

* Use Capacitor to wrap the deployed app for iOS/iPadOS.
* Supabase remains the cloud data source.
* App data is not stored only on the device.

## Project Status

This app is currently a personal self-use project.

Confirmed v1 scope:

* Cloud-first vocabulary storage
* AI JSON import
* Import preview
* Duplicate/conflict/incomplete handling
* New word learning
* Weighted spaced review
* TTS pronunciation
* Backup/export
* Responsive MacBook/iPad/iPhone UI

Not included in v1:

* Built-in AI image recognition
* Public signup
* Public demo mode
* Complex offline sync
* Verb conjugation drills
* Custom handwriting recognition
* App Store release

## Notes

This project is designed around my personal French learning workflow. The goal is not to build a public language-learning platform, but to create a focused, cloud-synced, personal vocabulary system that works across MacBook, iPad, and iPhone.
