import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { colors as C } from "../../theme";
import { ui } from "../../lib/ui";
import { dayKey, loadDaily, streakOf, loadMastery, MasteryTopic } from "../../lib/stats";

const LETTER = ["S", "M", "T", "W", "T", "F", "S"];

export default function Progress() {
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [mastery, setMastery] = useState<MasteryTopic[]>([]);
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => {
    Promise.all([
      loadDaily().then(setDaily),
      loadMastery().then(setMastery),
    ]).finally(() => setLoading(false));
  }, []));

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { letter: LETTER[d.getDay()], n: daily[dayKey(d)] || 0 };
  });
  const max = Math.max(1, ...last7.map((d) => d.n));
  const total = Object.values(daily).reduce((a, b) => a + b, 0);
  const activeDays = last7.filter((d) => d.n > 0).length;

  const stats: [string, string][] = [
    [`${streakOf(daily)} days`, "Current streak"],
    [String(total), "Questions asked"],
    [`${activeDays} of 7`, "Active days this week"],
  ];

  return (
    <Screen title="Progress">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {stats.map(([v, l]) => (
          <View key={l} style={{ width: "48%", backgroundColor: C.card, borderRadius: 14, padding: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "500", color: C.white }}>{v}</Text>
            <Text style={{ fontSize: 12, color: C.soft }}>{l}</Text>
          </View>
        ))}
      </View>

      <View style={ui.card}>
        <Text style={[ui.label, { marginBottom: 10 }]}>QUESTIONS ASKED, LAST 7 DAYS</Text>
        <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end", height: 120 }}>
          {last7.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6, height: 120 }}>
              <View style={{ width: "70%", maxWidth: 26, height: Math.max(4, (d.n / max) * 90), borderRadius: 6, backgroundColor: d.n === max && d.n > 0 ? C.white : C.mid }} />
              <Text style={{ fontSize: 11, color: C.soft }}>{d.letter}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={ui.card}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={ui.title}>Topic mastery</Text>
          <Ionicons name="refresh-outline" size={18} color={C.soft} />
        </View>
        {mastery.length === 0 ? (
          <Text style={ui.sub}>Complete some quizzes to see your topics here.</Text>
        ) : (
          mastery.map((m) => (
            <View key={m.topic} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.track }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14, color: C.white }}>{m.topic}</Text>
                {m.needs_review && (
                  <View style={{ backgroundColor: C.error, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: C.white }}>Review</Text>
                  </View>
                )
                }
              </View>
              <Text style={{ fontSize: 13, color: C.soft }}>{m.score_avg.toFixed(1)} / 5</Text>
            </View>
          ))
        )
        }
      </View>
      {loading && (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.white} />
        </View>
      )}
    </Screen>
  );
}
