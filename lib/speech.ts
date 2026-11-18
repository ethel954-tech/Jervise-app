import * as Speech from "expo-speech";

let cancelled = false;
let currentCallback: (() => void) | null = null;

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  return parts ? parts.map((s) => s.trim()).filter(Boolean) : [text];
}

// Speaks sentence by sentence so the first words start quickly.
// Phase 4.11: Speak each sentence as it arrives (streaming-friendly)
export function speak(
  text: string,
  onDone: () => void,
  language = "en-US",
  onSentenceStart?: (sentence: string) => void
) {
  cancelled = false;
  currentCallback = onDone;
  const parts = splitSentences(text);
  let i = 0;
  const next = () => {
    if (cancelled) {
      onDone();
      return;
    }
    if (i >= parts.length) {
      currentCallback = null;
      onDone();
      return;
    }
    const sentence = parts[i++];
    onSentenceStart?.(sentence);
    Speech.speak(sentence, { language, rate: 1.0, onDone: next, onError: next });
  };
  next();
}

// Phase 4.12: Interrupt Jarvis by talking over it
// Returns true if speech was actually interrupted
export async function interruptSpeaking(): Promise<boolean> {
  if (await Speech.isSpeakingAsync()) {
    cancelled = true;
    await Speech.stop();
    return true;
  }
  return false;
}

export function stopSpeaking() {
  cancelled = true;
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// Phase 4.14: Cloud TTS voice selection
// Built-in voices are free; cloud voices require API keys
export const BUILTIN_VOICES = {
  en: "en-US",
  fr: "fr-FR",
};

export type VoiceOption = {
  id: string;
  name: string;
  language: string;
  isCloud: boolean;
  requiresKey: boolean;
};

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: "en-US", name: "English (default)", language: "en-US", isCloud: false, requiresKey: false },
  { id: "fr-FR", name: "French (default)", language: "fr-FR", isCloud: false, requiresKey: false },
  // Cloud voices would be added here when configured
  // { id: "google-en", name: "Google English (natural)", language: "en-US", isCloud: true, requiresKey: true },
];

export function getVoiceOption(lang: string): VoiceOption | undefined {
  return AVAILABLE_VOICES.find((v) => v.language.startsWith(lang.slice(0, 2)));
}
