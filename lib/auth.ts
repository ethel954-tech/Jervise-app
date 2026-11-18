import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The app signs in anonymously so each phone gets its own private notes.
// Turn on "Anonymous sign-ins" in Supabase > Authentication > Providers.
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: res, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return res.session;
}

// Phase 4.17: Real sign-in migration
export type SignInMethod = "anonymous" | "email" | "google";

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await AsyncStorage.multiRemove(["jarvis.daily", "jarvis.plan", "jarvis.onboarded"]);
}

export async function getCurrentSignInMethod(): Promise<SignInMethod> {
  const user = await getCurrentUser();
  if (!user) return "anonymous";
  if (user.email) {
    // Check if it's a Google sign-in (Google emails often have specific patterns)
    if (user.app_metadata?.provider === "google" || user.user_metadata?.provider === "google") {
      return "google";
    }
    return "email";
  }
  return "anonymous";
}

// Migration helper: migrate notes from anonymous to a real account
// This would be called after a user signs in with email/Google
export async function migrateNotesToUser(anonymousUserId: string, newUserId: string): Promise<void> {
  // Update all notes, chunks, quiz attempts, topic mastery, etc. to the new user
  const tables = ["documents", "chunks", "quiz_attempts", "topic_mastery", "study_sessions", "flashcards", "lectures"];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ user_id: newUserId, migrated_from_anonymous: anonymousUserId })
      .eq("user_id", anonymousUserId);

    if (error) {
      console.error(`Failed to migrate ${table}:`, error);
    }
  }

  // Store migration status
  await AsyncStorage.setItem("jarvis.migratedFrom", anonymousUserId);
}

export async function hasMigrated(): Promise<boolean> {
  const migrated = await AsyncStorage.getItem("jarvis.migratedFrom");
  return !!migrated;
}
