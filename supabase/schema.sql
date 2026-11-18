-- Jarvis: database for notes and search.
-- Run this once in Supabase > SQL Editor.

create extension if not exists vector with schema extensions;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  status text not null default 'processing',
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chunks (
  id bigserial primary key,
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null,
  embedding extensions.vector(384) not null   -- 384 = size of the built-in gte-small model
);

create index if not exists chunks_embedding_idx on chunks using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists chunks_document_idx on chunks (document_id);

-- Each person only ever sees their own notes.
alter table documents enable row level security;
alter table chunks enable row level security;

create policy "own documents" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chunks" on chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Finds the pieces of your notes closest in meaning to a question.
create or replace function match_chunks(query_embedding extensions.vector(384), match_count int default 6)
returns table (id bigint, document_id uuid, title text, content text, similarity float)
language sql stable
as $$
  select c.id, c.document_id, d.title, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- Phase 2: Quiz attempts and topic mastery
-- ============================================

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  question text not null,
  expected_answer text not null,
  user_answer text,
  correct boolean,
  score int check (score >= 0 and score <= 5),
  topic text,
  created_at timestamptz not null default now()
);

create table if not exists topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topic text not null,
  score_avg numeric(3,1) not null default 0,
  attempts int not null default 0,
  last_reviewed timestamptz,
  next_review_date timestamptz,
  unique(user_id, topic)
);

alter table quiz_attempts enable row level security;
alter table topic_mastery enable row level security;

create policy "own quiz attempts" on quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own topic mastery" on topic_mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- Phase 2: Study sessions
-- ============================================

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topic text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 45,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'missed', 'snoozed')),
  completed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now()
);

alter table study_sessions enable row level security;

create policy "own study sessions" on study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- Phase 3: Flashcards with spaced repetition (SM-2)
-- ============================================

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  note_id uuid references documents(id) on delete cascade,
  question text not null,
  answer text not null,
  topic text,
  ease_factor numeric(4,2) not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists flashcards_next_review_idx on flashcards (user_id, next_review_date);

alter table flashcards enable row level security;

create policy "own flashcards" on flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- Phase 3: Lectures and recordings
-- ============================================

create table if not exists lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  source_type text not null default 'recording' check (source_type in ('recording', 'upload', 'drive')),
  source_url text,
  transcript text,
  summary text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  created_at timestamptz not null default now()
);

alter table lectures enable row level security;

create policy "own lectures" on lectures for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
