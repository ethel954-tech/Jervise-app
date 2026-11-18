import { supabase } from "./supabase";
import { ensureSession } from "./auth";

// Flashcard and SM-2 spaced repetition for Phase 3.9

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  created_at: string;
};

export type ReviewResult = {
  cardId: string;
  quality: number; // 0-5 quality rating
  newInterval: number;
  newEaseFactor: number;
  nextReviewDate: Date;
};

// SM-2 algorithm implementation
export function calculateSm2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number
): { newEaseFactor: number; newInterval: number; newRepetitions: number } {
  // Quality is 0-5, where 0-2 are failures, 3-5 are passes
  const newRepetitions = quality >= 3 ? repetitions + 1 : 0;

  // Calculate new interval based on repetitions
  let newInterval: number;
  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * easeFactor);
  }

  // Ensure minimum interval of 1 day
  newInterval = Math.max(1, newInterval);

  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  // Minimum EF is 1.3
  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    newEaseFactor: Math.round(newEaseFactor * 100) / 100,
    newInterval,
    newRepetitions,
  };
}

export async function getDueFlashcards(limit = 20): Promise<Flashcard[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .lte("next_review_date", new Date().toISOString())
    .order("next_review_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getFlashcardsForReview(limit = 20): Promise<Flashcard[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .or(`next_review_date.lte.${new Date().toISOString()},next_review_date.is.null`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function reviewFlashcard(
  cardId: string,
  quality: number
): Promise<ReviewResult> {
  await ensureSession();

  // Get the current card
  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError) throw fetchError;

  // Calculate new values using SM-2
  const { newEaseFactor, newInterval, newRepetitions } = calculateSm2(
    quality,
    card.ease_factor,
    card.interval_days,
    card.repetitions
  );

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  // Update the card
  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      ease_factor: newEaseFactor,
      interval_days: newInterval,
      repetitions: newRepetitions,
      next_review_date: nextReview.toISOString(),
    })
    .eq("id", cardId);

  if (updateError) throw updateError;

  return {
    cardId,
    quality,
    newInterval,
    newEaseFactor,
    nextReviewDate: nextReview,
  };
}

export async function createFlashcardFromNote(
  noteId: string,
  question: string,
  answer: string,
  topic?: string
): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase.from("flashcards").insert({
    note_id: noteId,
    question,
    answer,
    topic: topic || null,
    ease_factor: 2.5,
    interval_days: 1,
    repetitions: 0,
    next_review_date: new Date().toISOString(),
  }).select("id").single();

  if (error) throw error;
  return data.id;
}

export async function generateFlashcardsFromNote(
  noteId: string,
  noteTitle: string,
  noteContent: string
): Promise<string[]> {
  await ensureSession();

  // In production, this would call an Edge Function that uses AI to generate flashcards
  // For now, create simple flashcards from the content

  // Split content into sentences
  const sentences = noteContent
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 30)
    .map((s) => s.trim());

  const createdCards: string[] = [];

  // Create a flashcard for each significant sentence
  for (let i = 0; i < Math.min(sentences.length, 10); i++) {
    const sentence = sentences[i];
    const question = generateQuestionFromSentence(sentence);
    const answer = sentence;

    try {
      const cardId = await createFlashcardFromNote(noteId, question, answer, noteTitle);
      createdCards.push(cardId);
    } catch (e) {
      console.error("Failed to create flashcard:", e);
    }
  }

  return createdCards;
}

function generateQuestionFromSentence(sentence: string): string {
  // Simple question generation - in production, use AI
  // Remove trailing punctuation and add a question format
  const clean = sentence.replace(/[.!?]+$/, "").trim();

  // If the sentence contains "is", "are", "was", "were", create a "What is/are..." question
  if (/\\b(is|are|was|were)\\b/i.test(clean)) {
    return `What does this mean: "${clean.slice(0, 50)}..."`;
  }

  // Default: ask for explanation
  return `Explain: "${clean.slice(0, 50)}..."`;
}

export async function getFlashcardCount(): Promise<number> {
  await ensureSession();
  const { count, error } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function getDueCount(): Promise<number> {
  await ensureSession();
  const { count, error } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .lte("next_review_date", new Date().toISOString());

  if (error) return 0;
  return count ?? 0;
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  await ensureSession();
  const { error } = await supabase.from("flashcards").delete().eq("id", cardId);
  if (error) throw error;
}
