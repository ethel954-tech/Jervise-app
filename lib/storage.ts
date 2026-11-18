import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimeOfDay = "Morning" | "Afternoon" | "Evening" | "Night";

export type Plan = {
  subjects: string[];
  exam: string;
  days: string[]; // "Mon" ... "Sun"
  time: TimeOfDay;
  minutes: number;
  calendar: boolean;
  reminders: boolean;
};

export const TIME_HOURS: Record<TimeOfDay, number> = {
  Morning: 7,
  Afternoon: 14,
  Evening: 18,
  Night: 21,
};

const PLAN_KEY = "jarvis.plan";
const DONE_KEY = "jarvis.onboarded";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function savePlan(plan: Plan) {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export async function loadPlan(): Promise<Plan | null> {
  const raw = await AsyncStorage.getItem(PLAN_KEY);
  return raw ? (JSON.parse(raw) as Plan) : null;
}

export async function setOnboarded() {
  await AsyncStorage.setItem(DONE_KEY, "1");
}

export async function isOnboarded() {
  return (await AsyncStorage.getItem(DONE_KEY)) === "1";
}

export function formatHour(h: number) {
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}

export function nextSession(plan: Plan) {
  const hour = TIME_HOURS[plan.time];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(hour, 0, 0, 0);
    if (d <= now) continue;
    const name = DAY_NAMES[d.getDay()];
    if (plan.days.includes(name)) {
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : name;
      return { label, time: formatHour(hour), minutes: plan.minutes };
    }
  }
  return null;
}
