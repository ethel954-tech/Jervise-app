import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { ensureSession } from "./auth";
import { Doc, listDocs, ask, Turn } from "./api";

// Offline caching for Phase 3.10

const CACHE_KEYS = {
  NOTES: "jarvis.cache.notes",
  FLASHCARDS: "jarvis.cache.flashcards",
  PLAN: "jarvis.cache.plan",
  LAST_SYNC: "jarvis.cache.lastSync",
};

export type CachedNote = {
  id: string;
  title: string;
  status: string;
  chunk_count: number;
  cached_at: string;
};

export type CachedFlashcard = {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  cached_at: string;
};

export type CachedPlan = {
  subjects: string[];
  exam: string;
  days: string[];
  time: string;
  minutes: number;
  calendar: boolean;
  reminders: boolean;
  cached_at: string;
};

// Notes cache
export async function cacheNotes(notes: Doc[]): Promise<void> {
  const cached = await getCachedNotes();
  const now = new Date().toISOString();
  const toCache = notes.map((n) => ({
    ...n,
    cached_at: now,
  }));

  // Merge with existing cache, keeping the newest version of each note
  const merged = [...cached, ...toCache];
  const unique = merged.reduce((acc, note) => {
    const existing = acc.find((n) => n.id === note.id);
    if (existing) {
      // Keep the newer version
      return acc.map((n) => (n.id === note.id ? note : n));
    }
    return [...acc, note];
  }, [] as CachedNote[]);

  // Keep only the last 50 notes in cache
  const trimmed = unique.slice(0, 50);

  await AsyncStorage.setItem(CACHE_KEYS.NOTES, JSON.stringify(trimmed));
  await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, now);
}

export async function getCachedNotes(): Promise<CachedNote[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEYS.NOTES);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedNote[];
  } catch {
    return [];
  }
}

export async function getOfflineNotes(): Promise<Doc[]> {
  const cached = await getCachedNotes();
  return cached.map((n) => ({
    id: n.id,
    title: n.title,
    status: n.status,
    chunk_count: n.chunk_count,
  }));
}

export async function isOfflineNotesStale(): Promise<boolean> {
  const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
  if (!lastSync) return true;

  const syncTime = new Date(lastSync).getTime();
  const now = Date.now();
  // Consider cache stale if it's been more than 1 hour
  return now - syncTime > 60 * 60 * 1000;
}

// Flashcards cache
export async function cacheFlashcards(cards: any[]): Promise<void> {
  const cached = await getCachedFlashcards();
  const now = new Date().toISOString();
  const toCache = cards.map((c) => ({
    ...c,
    cached_at: now,
  }));

  const merged = [...cached, ...toCache];
  const unique = merged.reduce((acc: CachedFlashcard[], card: CachedFlashcard) => {
    const existing = acc.find((c) => c.id === card.id);
    if (existing) {
      return acc.map((c) => (c.id === card.id ? card : c));
    }
    return [...acc, card];
  }, [] as CachedFlashcard[]);

  // Keep only the last 100 flashcards
  const trimmed = unique.slice(0, 100);

  await AsyncStorage.setItem(CACHE_KEYS.FLASHCARDS, JSON.stringify(trimmed));
  await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, now);
}

export async function getCachedFlashcards(): Promise<CachedFlashcard[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEYS.FLASHCARDS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CachedFlashcard[];
  } catch {
    return [];
  }
}

export async function getOfflineFlashcards(): Promise<CachedFlashcard[]> {
  return getCachedFlashcards();
}

export async function getOfflineDueFlashcards(): Promise<CachedFlashcard[]> {
  const cards = await getCachedFlashcards();
  const now = new Date().toISOString();
  return cards.filter((c) => c.next_review_date <= now);
}

// Plan cache
export async function cachePlan(plan: any): Promise<void> {
  const cached = {
    ...plan,
    cached_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CACHE_KEYS.PLAN, JSON.stringify(cached));
}

export async function getCachedPlan(): Promise<CachedPlan | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEYS.PLAN);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedPlan;
  } catch {
    return null;
  }
}

export async function getOfflinePlan(): Promise<any | null> {
  const cached = await getCachedPlan();
  if (!cached) return null;
  return {
    subjects: cached.subjects,
    exam: cached.exam,
    days: cached.days,
    time: cached.time,
    minutes: cached.minutes,
    calendar: cached.calendar,
    reminders: cached.reminders,
  };
}

// Sync status
export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
}

export async function clearCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    CACHE_KEYS.NOTES,
    CACHE_KEYS.FLASHCARDS,
    CACHE_KEYS.PLAN,
    CACHE_KEYS.LAST_SYNC,
  ]);
}

// Check if we're online
export async function isOnline(): Promise<boolean> {
  try {
    // Try to make a simple request to Supabase
    const { error } = await supabase.from("documents").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Offline-first data loading
export async function loadNotesOfflineFirst(): Promise<{ notes: Doc[]; isOffline: boolean }> {
  // Try online first
  try {
    const notes = await listDocs();
    await cacheNotes(notes);
    return { notes, isOffline: false };
  } catch {
    // Fall back to cache
    const cached = await getOfflineNotes();
    return { notes: cached, isOffline: true };
  }
}

// Offline question answering (limited functionality)
export async function answerOffline(question: string): Promise<{ answer: string; source: string }> {
  // In offline mode, we can't query the AI
  // Return a helpful message
  return {
    answer: "I'm offline right now. Some features won't work without an internet connection. Try again when you're back online.",
    source: "offline",
  };
}
