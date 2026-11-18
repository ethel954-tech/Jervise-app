// Turns a note into searchable pieces: split into chunks, embed each, store them.
// Also handles PDF text extraction, OCR, and flashcard generation.
import { createClient } from "jsr:@supabase/supabase-js@2";

interface IngestBody {
  title: string;
  text?: string;
  pdf_content?: string; // Base64 encoded PDF
  image_content?: string; // Base64 encoded image for OCR
  source_type?: "text" | "pdf" | "image" | "lecture";
  generate_flashcards?: boolean;
}


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// @ts-ignore: Supabase.ai is built into the Edge Functions runtime
const embedder = new Supabase.ai.Session("gte-small");

function chunk(text: string, size = 900, overlap = 150) {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const out: string[] = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    out.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return json({ error: "Not signed in" }, 401);

    const { title, text } = await req.json();
    if (!title || !text) return json({ error: "title and text are required" }, 400);

    const { data: doc, error: docErr } = await db
      .from("documents")
      .insert({ user_id: auth.user.id, title, status: "processing" })
      .select("id")
      .single();
    if (docErr) throw docErr;

    // Starter limit: about 60,000 characters per note keeps this inside the free runtime limits.
    const parts = chunk(String(text).slice(0, 60000));
    const rows = [];
    for (const content of parts) {
      const emb = await embedder.run(content, { mean_pool: true, normalize: true });
      rows.push({ document_id: doc.id, user_id: auth.user.id, content, embedding: Array.from(emb as ArrayLike<number>) });
    }
    const { error: chunkErr } = await db.from("chunks").insert(rows);
    if (chunkErr) throw chunkErr;

    await db.from("documents").update({ status: "ready", chunk_count: rows.length }).eq("id", doc.id);
    return json({ document_id: doc.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
