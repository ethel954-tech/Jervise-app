# Jarvis Study

Jarvis Study is a mobile study assistant built with React Native and Expo. Add text notes, ask questions about them, and hear responses aloud. The app also includes a study plan, local reminders, calendar events, and a basic progress view.

> **Project status:** This is an early-stage project, not a production-ready app. Some screens and library modules are prototypes or placeholders. See [Current limitations](#current-limitations) before relying on any feature.

## Features

- Onboarding for subjects, study days, preferred time, session length, calendar access, and reminders.
- Home screen with study-plan summary, progress streak, and suggested prompts.
- Notes can be pasted or imported from `.txt` and `.md` files. Note text is uploaded to Supabase and indexed for semantic search.
- Tutor answers are generated from retrieved note content and read aloud with the device's text-to-speech engine. Captions are optional.
- Study-plan, calendar, and progress screens.
- Optional speech-recognition input on supported native builds.

## Requirements

- Node.js and npm.
- A Supabase project.
- An Anthropic API key for tutor responses.
- Android Studio for a local Android build, or Xcode on macOS for a local iOS build.

The project currently uses Expo SDK 51. Dependency compatibility and device behavior have not been verified across all platforms.

## Setup

### 1. Install dependencies

From the project directory:

```powershell
npm ci
```

### 2. Configure Supabase

1. Create a Supabase project.
2. In the Supabase dashboard, enable anonymous sign-ins under **Authentication → Providers**.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
4. Copy `.env.example` to `.env` and set your project URL and anon/public key:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

   In PowerShell, copy the example with:

   ```powershell
   Copy-Item .env.example .env
   ```

   The anon key is intended for client applications; do not put a Supabase service-role key or other server secret in `EXPO_PUBLIC_*` variables.

### 3. Configure and deploy Supabase Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then authenticate and link this directory to your project:

```powershell
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set ANTHROPIC_API_KEY=YOUR-ANTHROPIC-API-KEY
supabase functions deploy ask
supabase functions deploy ingest
```

The `ask` function uses the Anthropic API. Keep the API key in Supabase secrets; never add it to the app or commit it. The function currently defaults to the model configured in its source (`claude-haiku-5-5`); confirm that model is available for your Anthropic account before deploying.

### 4. Build and run the app

Speech recognition uses native code, so use a development build rather than assuming it will work in Expo Go.

For Android:

```powershell
npx expo run:android
npx expo start --dev-client
```

For iOS, use macOS with Xcode:

```sh
npx expo run:ios
npx expo start --dev-client
```

Calendar and notification behavior should be tested on a physical device. Permissions must be granted by the user.

## Development checks

Run the TypeScript check with:

```powershell
npx tsc --noEmit
```

There are currently no test, lint, or build scripts defined in `package.json`.

## Current limitations

- Sign-in is anonymous by default. Sign-in helpers exist, but there is no complete account-management flow in the app.
- Quiz flow, grading, flashcards, lectures, OCR, PDF extraction, and offline support are incomplete or prototype-level; do not assume these are fully usable.
- The Plan screen's suggested-time display is not currently based on calendar availability.
- Some Settings actions are not wired up.
- Calendar and reminder behavior depends on platform permissions and Expo SDK compatibility.
- The project has not been validated as a complete release build on Android and iOS.

## Project layout

```text
app/                  Expo Router screens and tabs
components/           Shared UI components, including the orb
lib/                  Supabase client, data access, speech, reminders, and helpers
supabase/schema.sql   Database schema and row-level security policies
supabase/functions/   Supabase Edge Functions for asking and ingesting notes
```

## Data and security notes

- The app uses Supabase anonymous authentication and row-level security to scope stored notes to the signed-in user.
- Note content is sent to the Supabase `ingest` function for embedding and stored in the project's database.
- Questions and retrieved note excerpts are sent by the `ask` function to Anthropic to generate an answer.
- Review the Supabase policies and Edge Function behavior before using real or sensitive study material.
- Do not commit `.env` or publish server-side API keys.
