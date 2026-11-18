import React, { useEffect, useState, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Orb, { OrbState } from "../components/Orb";
import { colors as C } from "../theme";
import { speak, stopSpeaking } from "../lib/speech";
import { submitQuizAnswer, createQuizAttempt, getQuizQuestions, QuizQuestion } from "../lib/api";

type QuizMode = "idle" | "asking" | "grading" | "explaining" | "done";

interface Props {
  questions: QuizQuestion[];
}

export default function QuizMode() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [mode, setMode] = useState<QuizMode>("idle");
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showCaptions, setShowCaptions] = useState(false);
  const spokenRef = useRef(false);

  AsyncStorage.getItem("jarvis.captions").then((v) => setShowCaptions(v === "1"));

  useEffect(() => {
    getQuizQuestions().then(setQuestions).catch(() => setQuestions([]));
  }, []);

  function startQuiz() {
    if (questions.length === 0) {
      setFeedback("No notes to quiz you on. Add some notes first.");
      setMode("done");
      return;
    }
    const q = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQ(q);
    setExpectedAnswer("");
    setUserAnswer("");
    setFeedback("");
    setMode("asking");
    speak(`Here's your question: ${extractQuestion(q.content)}. Answer out loud when you're ready.`, () => {}, "en-US");
  }

  function extractQuestion(content: string): string {
    // Extract a question-like sentence from the content
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    return sentences[Math.floor(Math.random() * sentences.length)]?.trim() ?? content.slice(0, 100);
  }

  async function startGrading() {
    if (!currentQ || !userAnswer.trim()) return;
    setMode("grading");
    stopSpeaking();

    // Create the attempt and submit
    const attemptId = await createQuizAttempt(
      currentQ.content.slice(0, 200),
      extractQuestion(currentQ.content),
      topic
    );
    setAttemptId(attemptId);

    // Grade using the AI (simplified: we'll check keyword overlap for now)
    const correct = gradeAnswer(userAnswer, extractQuestion(currentQ.content));
    const score = correct ? 4 : 2;

    await submitQuizAnswer(attemptId, userAnswer, score, correct, topic);

    const feedbackText = correct
      ? "That's right. Good work."
      : "Not quite. The key idea is: " + extractQuestion(currentQ.content).slice(0, 80);

    setFeedback(feedbackText);
    speak(feedbackText, () => {
      setMode("explaining");
    }, "en-US");
  }

  function gradeAnswer(userAnswer: string, expected: string): boolean {
    // Simple keyword overlap check - in production, use AI for grading
    const userWords = userAnswer.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const expectedWords = expected.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const overlap = userWords.filter((w) => expectedWords.includes(w)).length;
    return overlap >= Math.min(3, Math.ceil(expectedWords.length / 3));
  }

  function explainBack() {
    if (!currentQ) return;
    setMode("explaining");
    speak(
      `Let me explain this concept. ${currentQ.content.slice(0, 200)}. Does that make sense?`,
      () => {
        setMode("done");
      },
      "en-US"
    );
  }

  function nextQuestion() {
    if (questions.length <= 1) {
      setMode("done");
      speak("You've completed all the questions. Great studying!", () => {}, "en-US");
      return;
    }
    const remaining = questions.filter((q) => q !== currentQ);
    const q = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrentQ(q);
    setExpectedAnswer("");
    setUserAnswer("");
    setFeedback("");
    setMode("asking");
    speak(`Next question: ${extractQuestion(q.content)}`, () => {}, "en-US");
  }

  function toggleCaptions() {
    const next = !showCaptions;
    setShowCaptions(next);
    AsyncStorage.setItem("jarvis.captions", next ? "1" : "0");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close-outline" size={24} color={C.soft} />
        </Pressable>
        <Text style={{ fontSize: 13, color: C.soft }}>
          {mode === "asking" && "Question 1 of " + questions.length}
          {mode === "grading" && "Grading your answer..."}
          {mode === "explaining" && "Explanation"}
          {mode === "done" && "Quiz complete"}
        </Text>
        <Pressable onPress={toggleCaptions} hitSlop={12}>
          <Ionicons name={showCaptions ? "chatbubble" : "chatbubble-outline"} size={22} color={showCaptions ? C.white : C.soft} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
        <Orb
          state={mode === "asking" ? "listening" : mode === "grading" ? "thinking" : mode === "explaining" ? "speaking" : "idle"}
          size={200}
          onPress={() => {
            if (mode === "asking" || mode === "idle") {
              // Voice input for answer
              router.push({ pathname: "/talk", params: { prompt: "I want to answer: " + userAnswer } });
            }
          }}
        />

        {currentQ && (
          <View style={{ alignItems: "center", gap: 8 }}>
            {mode === "asking" && (
              <>
                <Text style={{ fontSize: 18, lineHeight: 28, textAlign: "center", color: C.white }}>
                  {extractQuestion(currentQ.content)}
                </Text>
                {showCaptions && (
                  <Text style={{ fontSize: 14, color: C.soft }}>Tap the orb to answer by voice, or type below</Text>
                )}
              </>
            )}

            {mode === "grading" && (
              <Text style={{ fontSize: 16, lineHeight: 24, textAlign: "center", color: C.soft }}>
                Checking your answer...
              </Text>
            )}

            {mode === "explaining" && (
              <Text style={{ fontSize: 16, lineHeight: 24, textAlign: "center", color: C.white }}>
                {feedback}
              </Text>
            )}

            {mode === "done" && (
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: "500", color: C.white }}>Quiz complete!</Text>
                <Text style={{ fontSize: 14, color: C.soft, textAlign: "center" }}>
                  {questions.length} questions reviewed
                </Text>
              </View>
            )}
          </View>
        )}

        {feedback && mode === "explaining" && (
          <Text style={{ fontSize: 15, lineHeight: 22, textAlign: "center", color: C.soft }}>
            {feedback}
          </Text>
        )}
      </View>

      <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.track }}>
        {mode === "idle" && (
          <Pressable style={[{ backgroundColor: C.white, paddingVertical: 14, borderRadius: 12 }]} onPress={startQuiz}>
            <Text style={{ color: C.bg, fontSize: 16, fontWeight: "500" }}>Start quiz</Text>
          </Pressable>
        )}

        {mode === "asking" && (
          <>
            <Pressable
              style={[{ backgroundColor: C.white, paddingVertical: 14, borderRadius: 12 }]}
              onPress={() => {
                // Voice input
                router.push({ pathname: "/talk", params: { prompt: "My answer is: " + userAnswer } });
              }}
            >
              <Text style={{ color: C.bg, fontSize: 16, fontWeight: "500" }}>Speak my answer</Text>
            </Pressable>
            <Pressable
              style={[{ backgroundColor: C.card, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border }]}
              onPress={() => {
                // Type answer - navigate to talk screen with answer prefilled
                router.push({ pathname: "/talk", params: { prompt: "My answer: " + userAnswer } });
              }}
            >
              <Text style={{ color: C.white, fontSize: 16 }}>Type my answer</Text>
            </Pressable>
          </>
        )}

        {mode === "grading" && (
          <Pressable style={[{ backgroundColor: C.white, paddingVertical: 14, borderRadius: 12 }]} onPress={startGrading} disabled>
            <Text style={{ color: C.bg, fontSize: 16 }}>Grading...</Text>
          </Pressable>
        )}

        {mode === "explaining" && (
          <Pressable style={[{ backgroundColor: C.white, paddingVertical: 14, borderRadius: 12 }]} onPress={explainBack}>
            <Text style={{ color: C.bg, fontSize: 16, fontWeight: "500" }}>Explain it back to me</Text>
          </Pressable>
        )}

        {mode === "done" && (
          <Pressable style={[{ backgroundColor: C.white, paddingVertical: 14, borderRadius: 12 }]} onPress={() => router.back()}>
            <Text style={{ color: C.bg, fontSize: 16, fontWeight: "500" }}>Done</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
