import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { ensureSession } from "./auth";

const KEY = "jarvis.daily"; // { "2026-10-14": 3, ... } questions asked per day

export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function loadDaily(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function recordQuestion() {
  const daily = await loadDaily();
  const k = dayKey();
  daily[k] = (daily[k] || 0) + 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(daily));
}

export function streakOf(daily: Record<string, number>) {
  const d = new Date();
  if (!daily[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (daily[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Phase 2.3: Mastery tracking

export type MasteryTopic = {
  topic: string;
  score_avg: number;
  attempts: number;
  next_review_date: string | null;
  needs_review: boolean;
};

export async function loadMastery(): Promise<MasteryTopic[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("topic_mastery")
    .select("topic, score_avg, attempts, next_review_date")
    .order("score_avg", { ascending: true });
  if (error) return [];
  const now = new Date();
  return (data ?? []).map((m) => ({
    ...m,
    needs_review: m.next_review_date ? new Date(m.next_review_date) <= now : false,
  }));
}

export async function getNeedsReviewCount(): Promise<number> {
  const mastery = await loadMastery();
  return mastery.filter((m) => m.needs_review).length;
}
