import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Orb from "../components/Orb";
import { colors as C } from "../theme";
import { ui } from "../lib/ui";
import { Plan, TimeOfDay, TIME_HOURS, savePlan, setOnboarded } from "../lib/storage";
import { addSessionsToCalendar, requestCalendar, requestNotifications, scheduleReminders, findFreeSlots } from "../lib/reminders";

const SUBJECTS = ["Computer science", "Medicine", "Law", "Business", "Languages", "Sciences", "Arts", "Other"];
const EXAMS = ["In 2 weeks", "In a month", "In 3 months", "No date yet"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES: TimeOfDay[] = ["Morning", "Afternoon", "Evening", "Night"];
const LENGTHS = [15, 30, 45, 60, 90];
const BUTTON = ["Get started", "Continue", "Continue", "Continue", "Allow calendar access", "Continue", "Start my first session"];
const SKIP: Record<number, string> = { 2: "Skip for now", 4: "Not now, I'll pick times myself", 5: "Skip for now" };
const LAST = 6;

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[ui.pill, on && ui.pillOn]}>
      <Text style={[ui.pillText, on && ui.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Row({ icon, title, sub, children }: { icon: any; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={22} color={C.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ui.title}>{title}</Text>
        <Text style={ui.sub}>{sub}</Text>
      </View>
      {children}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [exam, setExam] = useState("No date yet");
  const [days, setDays] = useState<string[]>(["Mon", "Wed", "Sat"]);
  const [time, setTime] = useState<TimeOfDay>("Evening");
  const [minutes, setMinutes] = useState(45);
  const [calendar, setCalendar] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [err, setErr] = useState("");

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    setErr("");
  };
  const go = (n: number) => {
    setErr("");
    setStep(n);
  };

  async function finish() {
    const plan: Plan = { subjects, exam, days, time, minutes, calendar, reminders };
    await savePlan(plan);
    await setOnboarded();
    try {
      if (reminders && (await requestNotifications())) await scheduleReminders(plan);
      if (calendar) await addSessionsToCalendar(plan);
    } catch (e) {
      // Reminders and calendar are optional; the app still works without them.
    }
    router.replace("/(tabs)");
  }

  async function next() {
    if (step === 1 && subjects.length === 0) return setErr("Choose at least one subject");
    if (step === 3 && days.length === 0) return setErr("Pick at least one day");
    if (step === 4) setCalendar(await requestCalendar());
    if (step === LAST) return finish();
    go(step + 1);
  }

  function skip() {
    if (step === 4) setCalendar(false);
    go(step + 1);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable onPress={() => go(step - 1)} style={{ width: 32, opacity: step > 0 ? 1 : 0 }} disabled={step === 0}>
          <Ionicons name="arrow-back" size={22} color={C.soft} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", gap: 5 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? C.white : C.track }} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 18, gap: 14 }}>
        {step === 0 && (
          <View style={{ alignItems: "center", justifyContent: "center", flex: 1, gap: 10 }}>
            <Orb state="listening" size={270} />
            <Text style={[ui.h, { marginTop: 6 }]}>Meet Jarvis</Text>
            <Text style={[ui.sub, { fontSize: 14, textAlign: "center", maxWidth: 260 }]}>
              Your voice study partner. It learns from your notes, then teaches you.
            </Text>
          </View>
        )}

        {step === 1 && (
          <>
            <Text style={ui.h}>What are you studying?</Text>
            <Text style={ui.sub}>Pick everything that applies.</Text>
            <View style={ui.wrap}>
              {SUBJECTS.map((s) => (
                <Pill key={s} label={s} on={subjects.includes(s)} onPress={() => toggle(subjects, setSubjects, s)} />
              ))}
            </View>
            <Text style={[ui.label, { marginTop: 8 }]}>NEXT EXAM</Text>
            <View style={ui.wrap}>
              {EXAMS.map((e) => (
                <Pill key={e} label={e} on={exam === e} onPress={() => setExam(e)} />
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={ui.h}>Bring your notes</Text>
            <Text style={ui.sub}>Jarvis reads them so it can answer from your own material. You add them from the Notes tab.</Text>
            <Row icon="clipboard-outline" title="Paste or pick text notes" sub="Available now" />
            <Row icon="document-text-outline" title="PDF files" sub="Coming in phase 3" />
            <Row icon="camera-outline" title="Scan with camera" sub="Coming in phase 3" />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={ui.h}>When do you want to study?</Text>
            <Text style={ui.sub}>Jarvis will remind you at these times.</Text>
            <Text style={ui.label}>DAYS</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {DAYS.map((d) => {
                const on = days.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggle(days, setDays, d)}
                    style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 0.5, borderColor: on ? C.white : C.border, backgroundColor: on ? C.white : "transparent", alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 12, color: on ? C.bg : C.light }}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={ui.label}>TIME OF DAY</Text>
            <View style={ui.wrap}>
              {TIMES.map((t) => (
                <Pill key={t} label={t} on={time === t} onPress={() => setTime(t)} />
              ))}
            </View>
            <Text style={ui.label}>SESSION LENGTH</Text>
            <View style={ui.wrap}>
              {LENGTHS.map((m) => (
                <Pill key={m} label={`${m} min`} on={minutes === m} onPress={() => setMinutes(m)} />
              ))}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={ui.h}>Let Jarvis add your sessions to your calendar</Text>
            <Text style={ui.sub}>Your study times show up next to your classes and other plans.</Text>
            <Row icon="calendar-outline" title="Adds your sessions" sub="Next 4 weeks, at the times you chose" />
            <Row icon="eye-off-outline" title="Doesn't read your events" sub="This version only writes, it never reads" />
          </>
        )}

        {step === 5 && (
          <>
            <Text style={ui.h}>Stay on track</Text>
            <Text style={ui.sub}>A reminder 10 minutes before each session.</Text>
            <Row icon="notifications-outline" title="Reminders" sub="A nudge when it's study time">
              <Switch value={reminders} onValueChange={setReminders} trackColor={{ true: C.accent, false: C.track }} thumbColor={C.white} />
            </Row>
          </>
        )}

        {step === 6 && (
          <>
            <Text style={ui.h}>Your plan is ready</Text>
            <Text style={ui.sub}>You can change this later.</Text>
            <View style={[ui.card, { gap: 10 }]}>
              {[
                ["Days", days.join(", ")],
                ["Time", time],
                ["Length", `${minutes} min`],
                ["Calendar", calendar ? "Connected" : "Not connected"],
                ["Reminders", reminders ? "On" : "Off"],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={ui.sub}>{k}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: C.white }}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={{ padding: 18, gap: 6 }}>
        <Text style={{ minHeight: 18, textAlign: "center", fontSize: 13, color: C.error }}>{err}</Text>
        <Pressable style={ui.btn} onPress={next}>
          <Text style={ui.btnText}>{BUTTON[step]}</Text>
        </Pressable>
        <Pressable style={[ui.ghost, { opacity: SKIP[step] ? 1 : 0 }]} disabled={!SKIP[step]} onPress={skip}>
          <Text style={ui.ghostText}>{SKIP[step] ?? " "}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
