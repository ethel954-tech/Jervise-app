import React, { useEffect, useRef, useState } from "react";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { KeyboardAvoidingView, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { interruptSpeaking, isSpeaking } from "../lib/speech";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Orb, { OrbState } from "../components/Orb";
import { colors as C } from "../theme";
import { ask, Turn } from "../lib/api";
import { speak, stopSpeaking } from "../lib/speech";
import { recordQuestion } from "../lib/stats";

const CAPTIONS_KEY = "jarvis.captions";
const STATUS: Record<OrbState, string> = {
  idle: "Type below, or tap the mic to talk",
  listening: "Listening…",
  thinking: "Searching your notes…",
  speaking: "Jarvis is speaking",
};

type VoiceState = "idle" | "starting" | "listening" | "stopping";

export default function Talk() {
  const router = useRouter();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const [state, setState] = useState<OrbState>("idle");
  const [text, setText] = useState("");
  const [isError, setIsError] = useState(false);
  const [input, setInput] = useState("");
  const [captions, setCaptions] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isInterrupted, setIsInterrupted] = useState(false);
  const history = useRef<Turn[]>([]);
  const sentPrompt = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(CAPTIONS_KEY).then((v) => setCaptions(v === "1"));
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (prompt && !sentPrompt.current) {
      sentPrompt.current = true;
      send(String(prompt));
    }
  }, [prompt]);

  useSpeechRecognitionEvent("start", () => setVoiceState("listening"));
  useSpeechRecognitionEvent("end", () => {
    setVoiceState("idle");
    setState((current) => current === "listening" ? "idle" : current);
  });
  useSpeechRecognitionEvent("result", (event) => {
    const last = event.results[event.results.length - 1];
    if (event.isFinal && last) {
      setVoiceState("idle");
      setIsInterrupted(false);
      send(last.transcript);
    }
  });
  useSpeechRecognitionEvent("error", () => {
    setVoiceState("idle");
    setState((current) => current === "listening" ? "idle" : current);
  });

  async function startListening() {
    if (voiceState === "listening") return;
    setVoiceState("starting");
    setState("listening");
    try {
      const supported = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!supported) {
        setVoiceState("idle");
        setState("idle");
        return;
      }
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setVoiceState("idle");
        setState("idle");
        return;
      }
      await ExpoSpeechRecognitionModule.start({
        lang: captions ? "fr-FR" : "en-US",
        continuous: false,
        interimResults: false,
      });
      setVoiceState("listening");
    } catch (e) {
      setVoiceState("idle");
      setState("idle");
    }
  }

  async function stopListening() {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch {}
    setVoiceState("idle");
    if (state === "listening") setState("idle");
  }

  // Phase 4.12: Handle interruption - when user starts speaking while Jarvis is talking
  async function handleVoiceInterruption() {
    // Check if Jarvis is currently speaking
    if (await isSpeaking()) {
      await interruptSpeaking();
      setIsInterrupted(true);
      setState("listening");
      // Start listening for the interruption
      await startListening();
    }
  }

  async function send(q: string) {
    const question = q.trim();
    if (!question) return;
    Keyboard.dismiss();
    stopSpeaking();
    stopListening();
    setInput("");
    setText("");
    setIsError(false);
    setState("thinking");
    setVoiceState("idle");
    try {
      const r = await ask(question, history.current);
      history.current = [...history.current, { role: "user" as const, content: question }, { role: "assistant" as const, content: r.answer }].slice(-8);
      setText(r.answer);
      recordQuestion();
      setState("speaking");
      speak(r.answer, () => setState("idle"));
    } catch (e) {
      setIsError(true);
      setText("I couldn't reach my brain. Check your internet connection and your Supabase setup, then try again.");
      setState("idle");
    }
  }

  function toggleCaptions() {
    const next = !captions;
    setCaptions(next);
    AsyncStorage.setItem(CAPTIONS_KEY, next ? "1" : "0");
  }

  const showText = (captions || isError) && text.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-down" size={26} color={C.soft} />
          </Pressable>
          <Text style={{ fontSize: 13, color: C.soft }}>{STATUS[state]}</Text>
          <Pressable onPress={toggleCaptions} hitSlop={12}>
            <Ionicons name={captions ? "chatbubble" : "chatbubble-outline"} size={22} color={captions ? C.white : C.soft} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", gap: 8 }}>
            <Orb
              state={state}
              size={260}
              onPress={() => {
                if (state === "speaking") {
                  stopSpeaking();
                  setState("idle");
                } else if (voiceState === "listening") {
                  stopListening();
                } else if (voiceState === "idle" || voiceState === "starting") {
                  startListening();
                } else {
                  router.push("/talk");
                }
              }}
            />
            {voiceState === "listening" && (
              <Pressable onPress={stopListening} style={{ padding: 6, backgroundColor: C.card, borderRadius: 20 }}>
                <Ionicons name="stop-outline" size={14} color={C.white} />
              </Pressable>
            )}
          </View>
          {showText && (
            <Text style={{ fontSize: 16, lineHeight: 24, textAlign: "center", color: isError ? C.error : C.white }}>{text}</Text>
          )}
          {state === "speaking" && <Text style={{ fontSize: 13, color: C.soft }}>Tap the orb to stop</Text>}
          {voiceState === "listening" && <Text style={{ fontSize: 13, color: C.soft }}>Tap the stop button or speak to send</Text>}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, padding: 16, alignItems: "center" }}>
          <Pressable
            onPress={startListening}
            disabled={voiceState === "listening"}
            style={[{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }, voiceState === "listening" ? { backgroundColor: C.accent } : { backgroundColor: C.white }]}
          >
            <Ionicons name={voiceState === "listening" ? "mic" : "mic-outline"} size={22} color={voiceState === "listening" ? C.bg : C.bg} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            onFocus={() => { if (voiceState !== "listening") setState("listening"); }}
            onBlur={() => setState((s) => (s === "listening" ? "idle" : s))}
            onSubmitEditing={() => send(input)}
            placeholder="Ask Jarvis anything from your notes"
            placeholderTextColor={C.soft}
            returnKeyType="send"
            style={{ flex: 1, backgroundColor: C.card, color: C.white, borderRadius: 22, paddingHorizontal: 16, height: 46, fontSize: 15 }}
          />
          <Pressable onPress={() => send(input)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-up" size={22} color={C.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
