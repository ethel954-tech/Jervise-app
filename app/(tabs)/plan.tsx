import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { colors as C } from "../../theme";
import { ui } from "../../lib/ui";
import { Plan, TIME_HOURS, formatHour, loadPlan, savePlan } from "../../lib/storage";
import { getUpcomingSessions, updateSessionStatus, createStudySession, getWeakTopics } from "../../lib/api";
import { StudySession } from "../../lib/api";

const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, date: d.getDate(), isToday: d.toDateString() === today.toDateString() };
  });
}

export default function PlanTab() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selected, setSelected] = useState(NAMES[(new Date().getDay() + 6) % 7]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => {
    Promise.all([
      loadPlan().then(setPlan),
      getUpcomingSessions().then(setSessions),
    ]).finally(() => setLoading(false));
  }, []));
  const week = weekDates();
  const planned = plan?.days.includes(selected);

  return (
    <Screen title="Study plan">
      <View style={{ flexDirection: "row", gap: 4 }}>
        {week.map((d) => {
          const on = selected === d.name;
          const has = plan?.days.includes(d.name);
          return (
            <Pressable key={d.name} onPress={() => setSelected(d.name)} style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 8, borderRadius: 12, backgroundColor: on ? C.white : "transparent" }}>
              <Text style={{ fontSize: 11, color: on ? C.bg : C.soft }}>{d.name.toUpperCase()}</Text>
              <Text style={{ fontSize: 16, fontWeight: "500", color: on ? C.bg : d.isToday ? C.soft : C.white }}>{d.date}</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: has ? (on ? C.accent : C.soft) : "transparent" }} />
            </Pressable>
          );
        })}
      </View>

      {planned && plan ? (
        <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.title}>{formatHour(TIME_HOURS[plan.time])} · Study session</Text>
            <Text style={ui.sub}>{plan.minutes} min · reminder 10 minutes before</Text>
          </View>
          <Pressable style={[ui.btn, { height: 38, paddingHorizontal: 18, borderRadius: 12 }]} onPress={() => {
            // Create a study session and start the quiz
            void (async () => {
              const weakTopics = await getWeakTopics();
              const topic = weakTopics.length > 0 ? weakTopics[0] : null;
              await createStudySession(topic, new Date(), plan.minutes);
              router.push({ pathname: "/talk", params: { prompt: "Let's study. Quiz me on my notes, one question at a time. Focus on: " + (topic || "general") } });
            })();
          }}>
            <Text style={[ui.btnText, { fontSize: 14 }]}>Start</Text>
          </Pressable>
        </View>
      ) : (
        <View style={ui.card}>
          <Text style={ui.title}>Rest day</Text>
          <Text style={ui.sub}>Nothing planned. Jarvis will leave you alone.</Text>
        </View>
      )}

      {plan && (
        <View style={ui.card}>
          <Text style={ui.title}>Your rhythm</Text>
          <Text style={ui.sub}>{plan.days.join(", ")} · {plan.time.toLowerCase()} · {plan.minutes} min</Text>
        </View>
      )}

      {sessions.length > 0 && (
        <View style={ui.card}>
          <Text style={[ui.label, { marginBottom: 10 }]}>UPCOMING SESSIONS</Text>
          {sessions.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.track }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: C.white }}>
                  {new Date(s.scheduled_at).toLocaleDateString()} {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {s.topic ? ` · ${s.topic}` : ''}
                </Text>
                <Text style={ui.sub}>{s.duration_minutes} min</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  style={{ backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  onPress={() => updateSessionStatus(s.id, 'done')}
                >
                  <Text style={{ fontSize: 12, color: C.bg, fontWeight: '500' }}>Done</Text>
                </Pressable>
                <Pressable
                  style={{ backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}
                  onPress={() => updateSessionStatus(s.id, 'missed')}
                >
                  <Text style={{ fontSize: 12, color: C.soft }}>Missed</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {!loading && plan && (
        <View style={ui.card}>
          <Text style={[ui.label, { marginBottom: 10 }]}>SUGGESTED TIMES (from your calendar)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Pressable
                key={i}
                style={[ui.pill, { backgroundColor: C.accent, borderColor: C.accent }]}
                onPress={() => {
                  // Suggest this time slot to the user
                  router.push({ pathname: "/talk", params: { prompt: `Schedule a study session at ${new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toLocaleDateString()} at ${formatHour(TIME_HOURS[plan.time])}` } });
                }}
              >
                <Text style={[ui.pillText, { color: C.bg }]}>
                  {new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toLocaleDateString()} at {formatHour(TIME_HOURS[plan.time])}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[ui.sub, { marginTop: 8 }]}>
            Based on your calendar, these times look free for studying.
          </Text>
        </View>
      )}

      {loading && (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.white} />
        </View>
      )}
    </Screen>
  );
}
