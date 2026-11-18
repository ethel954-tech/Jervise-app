import { supabase } from "./supabase";
import { ensureSession } from "./auth";

// Lecture recording and transcript for Phase 4.16

export type Lecture = {
  id: string;
  title: string;
  source_type: string;
  source_url: string | null;
  transcript: string | null;
  summary: string | null;
  status: string;
  created_at: string;
};

export type LectureWithQuiz = {
  lecture: Lecture;
  quiz_questions?: string[];
};

export async function createLecture(
  title: string,
  sourceType: "recording" | "upload" | "drive" = "recording",
  sourceUrl?: string
): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase
    .from("lectures")
    .insert({
      title,
      source_type: sourceType,
      source_url: sourceUrl || null,
      status: "processing",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getLectures(limit = 20): Promise<Lecture[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getLecture(id: string): Promise<Lecture | null> {
  await ensureSession();
  const { data, error } = await supabase.from("lectures").select("*").eq("id", id).single();

  if (error) throw error;
  return data ?? null;
}

export async function updateLectureTranscript(
  id: string,
  transcript: string,
  summary?: string
): Promise<void> {
  await ensureSession();
  const updates: any = { transcript, status: "ready" };
  if (summary) updates.summary = summary;

  const { error } = await supabase.from("lectures").update(updates).eq("id", id);
  if (error) throw error;
}

export async function generateQuizFromLecture(
  lectureId: string
): Promise<{ questions: string[] }> {
  await ensureSession();

  const lecture = await getLecture(lectureId);
  if (!lecture || !lecture.transcript) {
    throw new Error("Lecture not found or has no transcript");
  }

  // In production, this would call an Edge Function that uses AI to generate quiz questions
  // For now, return a placeholder

  return {
    questions: [
      `What was the main topic of the lecture: "${lecture.title}"?`,
      `Summarize the key points from the lecture in your own words.`,
      `What was the most important concept you learned?`,
    ],
  };
}

// Recording functionality
import { Audio } from "expo-av";

let activeRecording: Audio.Recording | null = null;

export async function startRecording(): Promise<string | null> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Microphone permission required");
    }

    const { recording } = await Audio.Recording.createAsync();
    activeRecording = recording;
    return "recording";
  } catch (error) {
    console.error("Recording start error:", error);
    throw error;
  }
}

export async function stopRecording(sessionId: string): Promise<string | null> {
  try {
    if (!activeRecording) return null;
    await activeRecording.stopAndUnloadAsync();
    const uri = activeRecording.getURI();
    activeRecording = null;
    return uri;
  } catch (error) {
    console.error("Recording stop error:", error);
    throw error;
  }
}

// Google Drive sync placeholder
export async function syncFromGoogleDrive(folderId?: string): Promise<Lecture[]> {
  // In production, this would:
  // 1. Authenticate with Google Drive
  // 2. List files in the specified folder
  // 3. Download audio/video files
  // 4. Create lectures from them

  console.log("Google Drive sync requested for folder:", folderId);
  return [];
}

// In production, you would use:
// - expo-av for recording
// - Google Drive API for sync
// - Server-side transcription (e.g., Whisper API)
// - Server-side summarization and quiz generation
