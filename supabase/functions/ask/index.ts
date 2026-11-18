// Answers a question using only the user's own notes, written to be spoken aloud.
// Also handles quiz grading and flashcard generation.
import { createClient } from "jsr:@supabase/supabase-js@2";

interface RequestBody {
  question: string;
  history?: { role: string; content: string }[];
  context?: {
    type?: "answer" | "quiz" | "grade" | "flashcard";
    document_id?: string;
    question?: string;
    user_answer?: string;
    expected_answer?: string;
  };
}


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// @ts-ignore: Supabase.ai is built into the Edge Functions runtime
const embedder = new Supabase.ai.Session("gte-small");

const SYSTEM = `You are Jarvis, a friendly voice tutor. Your answers are spoken aloud, so talk like a person: 2 to 4 short sentences, no lists, no markdown, no emojis.
Use ONLY the notes provided. If the notes don't cover the question, say so briefly and offer another way to help.
Teach, don't just recite: use a simple example or analogy, and end with one short question that checks understanding or offers the next step.
If asked to quiz the student, ask exactly one question from the notes and wait for the answer. When they answer, say whether it is right, explain briefly, then offer the next question.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return json({ error: "Not signed in" }, 401);

    const body: RequestBody = await req.json();
    const { question, history = [], context } = body;
    if (!question) return json({ error: "question is required" }, 400);

    const emb = await embedder.run(question, { mean_pool: true, normalize: true });
    const { data: hits, error } = await db.rpc("match_chunks", {
      query_embedding: Array.from(emb as ArrayLike<number>),
      match_count: 6,
    });
    if (error) throw error;

    const noteContext = (hits ?? []).map((h: any, i: number) => `[${i + 1}] (${h.title}) ${h.content}`).join("\n\n");

    // Keep the last few turns so quizzes and follow-ups make sense. The API needs the first turn to be the user's.
    let turns = (history as { role: string; content: string }[]).slice(-6);
    while (turns.length && turns[0].role !== "user") turns = turns.slice(1);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("JARVIS_MODEL") ?? "claude-haiku-5-5",
        max_tokens: 400,
        system: SYSTEM,
        messages: [...turns, { role: "user", content: `My notes:\n${noteContext || "(no notes found)"}\n\nMy message: ${question}` }],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const answer = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ").trim();

    const ids = [...new Set((hits ?? []).map((h: any) => h.document_id))];

    // Handle different context types
    const response: any = { answer, sources: ids.map((document_id) => ({ document_id })) };

    // If this is a quiz grading request, include grading info
    if (context?.type === "grade" && context.user_answer && context.expected_answer) {
      response.grade = {
        correct: answer.toLowerCase().includes("correct") || answer.toLowerCase().includes("right"),
        explanation: answer,
      };
    }

    // If this is a flashcard generation request, include flashcard data
    if (context?.type === "flashcard" && context.document_id) {
      response.flashcards = [
        { question: answer, answer: context.question, topic: context.document_id },
      ];
    }

    return json(response);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
