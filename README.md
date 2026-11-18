# Jarvis, your voice study partner

An Expo (React Native) app: a Jarvis-style orb you talk to, a tutor that answers from **your own notes**
and speaks the answer aloud, a study plan with reminders, and a progress tab.

Indigo and white, with the same HUD orb on every screen.

> **Honest status:** this is a starter, written but **not yet run on a device**. Expect to fix a few small
> things the first time (package versions, a typo). Phase 1 of the roadmap is done; phases 2 to 4 are not.

## What works

- Onboarding (7 steps): subjects, study days and time, calendar, reminders. Saves your plan.
- Home with the animated orb (idle, listening, thinking, speaking), your next session, and quick prompts.
- Voice screen: type or dictate (use the mic on your phone keyboard), Jarvis answers **out loud**.
  Captions are off by default; the speech-bubble button shows them. Errors always show as text.
- Notes: paste text or pick a .txt/.md file. It is split up, embedded, and stored for search.
- Answers come only from your notes, with the last few turns remembered (so "quiz me" works).
- Plan: week view of your sessions. Weekly reminders 10 minutes before each one. Sessions added to your calendar.
- Progress: streak and questions asked per day.

## What is NOT built yet (next phases)

- Built-in speech-to-text (the orb listening to your voice). For now, use your keyboard's dictation.
  Next step: add `expo-speech-recognition` (needs a development build, not Expo Go).
- PDF reading and camera scan (OCR), diagrams, flashcards, quizzes with mastery tracking, video explainers,
  "Hey Jarvis" wake word, interrupting Jarvis by voice.
- A more natural voice. The phone's built-in voice is used (free, a bit robotic).

## Run it

1. Install Node.js 20+ on your computer, then in this folder:
   ```
   npm install
   npx expo install --fix
   cp .env.example .env
   ```
   (`expo install --fix` lines up package versions with your Expo version.)
2. Create a free project at supabase.com, then fill `.env` with the Project URL and the anon key
   (Project settings > API).
3. In Supabase:
   - Authentication > Providers > turn on **Anonymous sign-ins**.
   - SQL Editor > paste and run `supabase/schema.sql`.
4. Deploy the two functions (install the Supabase CLI first):
   ```
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set ANTHROPIC_API_KEY=your-key
   supabase functions deploy ask
   supabase functions deploy ingest
   ```
   The model defaults to `claude-haiku-5-5`. Change it with `supabase secrets set JARVIS_MODEL=...`.
5. Start the app and open it on your phone with the Expo Go app:
   ```
   npx expo start
   ```

## Good to know

- Calendar and reminders need a real phone. If reminders do not fire, check `lib/reminders.ts`:
  newer Expo versions want `type: Notifications.SchedulableTriggerInputTypes.WEEKLY` in the trigger.
- Each phone gets a private anonymous account. Notes stay on that account only (row-level security).
  Before publishing to the Play Store, add proper sign-in so people can keep their notes across phones.
- Free-tier limits: notes are capped at about 60,000 characters each; keep an eye on your AI API usage.

## Folder map

```
app/            screens (onboarding, tabs, voice screen)
components/     Orb (the HUD orb), Screen (shared header)
lib/            storage, reminders + calendar, speech, API, stats
supabase/       schema.sql and the two edge functions (ask, ingest)
theme.ts        indigo and white colors
```
