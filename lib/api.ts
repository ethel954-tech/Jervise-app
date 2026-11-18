import { supabase } from "./supabase";
import { ensureSession } from "./auth";

export type Source = { document_id: string };
export type Turn = { role: "user" | "assistant"; content: string };

export async function ask(question: string, history: Turn[] = []): Promise<{ answer: string; sources: Source[] }> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke("ask", { body: { question, history } });
  if (error) throw error;
  return data;
}

export async function ingestText(title: string, text: string): Promise<{ document_id: string }> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke("ingest", { body: { title, text } });
  if (error) throw error;
  return data;
}

export type Doc = { id: string; title: string; status: string; chunk_count: number };

export async function listDocs(): Promise<Doc[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,status,chunk_count")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Phase 2.2: Quiz functions
export type QuizAttempt = {
  id: string;
  question: string;
  expected_answer: string;
  user_answer: string | null;
  correct: boolean | null;
  score: number | null;
  topic: string | null;
  created_at: string;
};

export async function createQuizAttempt(
  question: string,
  expectedAnswer: string,
  topic: string | null = null
): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({ question, expected_answer: expectedAnswer, topic })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function submitQuizAnswer(
  attemptId: string,
  userAnswer: string,
  score: number,
  correct: boolean,
  topic: string | null = null
): Promise<void> {
  await ensureSession();
  const { error } = await supabase
    .from("quiz_attempts")
    .update({ user_answer: userAnswer, score, correct })
    .eq("id", attemptId);
  if (error) throw error;

  // Update topic mastery
  if (topic) {
    const { data: existing } = await supabase
      .from("topic_mastery")
      .select("id, score_avg, attempts")
      .eq("user_id", (await supabase.auth.getSession()).data.session?.user?.id)
      .eq("topic", topic)
      .single();

    const now = new Date();
    const nextReview = calculateNextReview(score, existing?.score_avg ?? 0, existing?.attempts ?? 0);

    if (existing) {
      const newAvg = ((existing.score_avg * existing.attempts + score) / (existing.attempts + 1)).toFixed(1);
      await supabase
        .from("topic_mastery")
        .update({ score_avg: parseFloat(newAvg), attempts: existing.attempts + 1, last_reviewed: now, next_review_date: nextReview })
        .eq("id", existing.id);
    } else {
      await supabase.from("topic_mastery").insert({
        topic,
        score_avg: score,
        attempts: 1,
        last_reviewed: now,
        next_review_date: nextReview,
      });
    }
  }
}

export async function getQuizQuestions(topic?: string, limit = 5): Promise<QuizQuestion[]> {
  await ensureSession();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, status")
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  if (!docs || docs.length === 0) return [];

  // Get random chunks from documents to generate questions from
  const { data: chunks } = await supabase
    .from("chunks")
    .select("content, document_id")
    .in("document_id", docs.map((d) => d.id))
    .limit(limit * 3);

  if (!chunks || chunks.length === 0) return [];

  return chunks.slice(0, limit).map((c) => ({
    content: c.content,
    document_id: c.document_id,
    document_title: docs.find((d) => d.id === c.document_id)?.title ?? "",
  }));
}

export type QuizQuestion = {
  content: string;
  document_id: string;
  document_title: string;
};

function calculateNextReview(score: number, currentAvg: number, attemptCount: number): Date {
  const now = new Date();
  // SM-2 inspired: higher scores push review further out
  const days = score >= 4 ? Math.min(30, 2 + attemptCount) : score >= 3 ? 2 : 1;
  now.setDate(now.getDate() + days);
  return now;
}

// Phase 2.4: Study sessions
export type StudySession = {
  id: string;
  topic: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  completed_at: string | null;
  snoozed_until: string | null;
  created_at: string;
};

export async function createStudySession(topic: string | null, scheduledAt: Date, durationMinutes = 45): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ topic, scheduled_at: scheduledAt, duration_minutes: durationMinutes, status: "scheduled" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getUpcomingSessions(limit = 5): Promise<StudySession[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateSessionStatus(id: string, status: "done" | "missed" | "snoozed", snoozedUntil?: Date): Promise<void> {
  await ensureSession();
  const updates: any = { status };
  if (status === "done") updates.completed_at = new Date();
  if (status === "snoozed" && snoozedUntil) updates.snoozed_until = snoozedUntil;
  const { error } = await supabase.from("study_sessions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function getWeakTopics(limit = 3): Promise<string[]> {
  await ensureSession();
  const { data } = await supabase
    .from("topic_mastery")
    .select("topic, score_avg")
    .order("score_avg", { ascending: true })
    .limit(limit);
  if (!data) return [];
  return data.filter((t) => t.score_avg < 3).map((t) => t.topic);
}
