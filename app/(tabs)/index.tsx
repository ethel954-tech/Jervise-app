import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Orb from "../../components/Orb";
import { colors as C } from "../../theme";
import { ui } from "../../lib/ui";
import { loadPlan, nextSession } from "../../lib/storage";
import { loadDaily, streakOf, getNeedsReviewCount } from "../../lib/stats";

const CHIPS: [any, string, string][] = [
  ["help-circle-outline", "Quiz me", "Quiz me on my notes. Ask one question and wait for my answer."],
  ["document-text-outline", "Summarize", "Summarize my notes in a few sentences."],
  ["bulb-outline", "Explain simply", "Explain the main idea of my notes in simple words."],
  ["key-outline", "Key terms", "What are the key terms in my notes? Explain two of them."],
];

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof nextSession>>(null);
  const [streak, setStreak] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        loadPlan().then((p) => setSession(p ? nextSession(p) : null)),
        loadDaily().then((d) => setStreak(streakOf(d))),
        getNeedsReviewCount().then(setNeedsReview),
      ]).finally(() => setLoading(false));
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={ui.sub}>Good to see you</Text>
            <Text style={{ fontSize: 18, fontWeight: "500", color: C.white }}>Ready to study?</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="flame-outline" size={20} color={C.soft} />
            <Text style={{ fontSize: 15, fontWeight: "500", color: C.white }}>{streak}</Text>
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 6 }}>
          <Orb state="idle" size={240} onPress={() => router.push("/talk")} />
          <Text style={{ fontSize: 14, color: C.light }}>Tap the orb to talk to Jarvis</Text>
        </View>

        <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.label}>{session ? `${session.label.toUpperCase()} · ${session.time}` : "NO SESSION PLANNED"}</Text>
            <Text style={[ui.title, { fontSize: 16, marginTop: 2 }]}>{session ? "Study session" : "Set your study times in Plan"}</Text>
            {session && <Text style={ui.sub}>{session.minutes} min with Jarvis</Text>}
          </View>
          {session && (
            <>
              <Pressable style={[ui.btn, { height: 38, paddingHorizontal: 18, borderRadius: 12 }]} onPress={() => router.push({ pathname: "/talk", params: { prompt: "Let's study. Quiz me on my notes, one question at a time." } })}>
                <Text style={[ui.btnText, { fontSize: 14 }]}>Start</Text>
              </Pressable>
              {needsReview > 0 && (
                <View style={{ marginLeft: 8, backgroundColor: C.error, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: C.white }}>{needsReview} to review</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CHIPS.map(([icon, label, prompt]) => (
            <Pressable
              key={label}
              onPress={() => router.push({ pathname: "/talk", params: { prompt } })}
              style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderRadius: 12, padding: 12 }}
            >
              <Ionicons name={icon} size={18} color={C.soft} />
              <Text style={{ fontSize: 14, color: C.white }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading && (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.white} />
        </View>
      )}
    </SafeAreaView>
  );
}
