import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Plan, TIME_HOURS } from "./storage";

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function requestCalendar() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

// Weekly local reminder, 10 minutes before each study session.
export async function scheduleReminders(plan: Plan) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study", {
      name: "Study reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  const startMinutes = TIME_HOURS[plan.time] * 60 - 10;
  const hour = Math.floor(startMinutes / 60);
  const minute = startMinutes % 60;
  for (const day of plan.days) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study time in 10 minutes",
        body: "Open Jarvis and say: let's study.",
      },
      // expo-notifications weekday: 1 = Sunday. If your SDK version requires it,
      // add `type: Notifications.SchedulableTriggerInputTypes.WEEKLY`.
      trigger: { weekday: DAY_INDEX[day] + 1, hour, minute, repeats: true, channelId: "study" } as any,
    });
  }
}

async function writableCalendarId() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.find((c) => c.allowsModifications)?.id;
}

// Adds the next few weeks of sessions to the phone calendar.
export async function addSessionsToCalendar(plan: Plan, weeks = 4) {
  const calendarId = await writableCalendarId();
  if (!calendarId) return;
  const hour = TIME_HOURS[plan.time];
  const now = new Date();
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const name = Object.keys(DAY_INDEX).find((k) => DAY_INDEX[k] === day.getDay())!;
    if (!plan.days.includes(name)) continue;
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    if (start <= now) continue;
    const end = new Date(start.getTime() + plan.minutes * 60000);
    await Calendar.createEventAsync(calendarId, {
      title: "Jarvis study session",
      startDate: start,
      endDate: end,
      notes: "Open Jarvis and say: let's study.",
    });
  }
}

// Phase 2.5: Read phone calendar to find free slots
export type CalendarSlot = {
  start: Date;
  end: Date;
  title: string;
  isFree: boolean;
};

export async function getCalendarEvents(daysForward = 7): Promise<CalendarSlot[]> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const now = new Date();
    const end = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);

    const events: CalendarSlot[] = [];
    for (const calendar of calendars) {
      if (!calendar.allowsModifications) continue;
      try {
        const calendarEvents = await Calendar.getEventsAsync([calendar.id], now, end);
        for (const event of calendarEvents) {
          events.push({
            start: new Date(event.startDate),
            end: new Date(event.endDate),
            title: event.title,
            isFree: false,
          });
        }
      } catch {
        // Some calendars may not be accessible
      }
    }
    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  } catch {
    return [];
  }
}

export async function findFreeSlots(daysForward = 7, minSlotMinutes = 30, preferredDays?: string[]): Promise<{ start: Date; end: Date }[]> {
  const events = await getCalendarEvents(daysForward);
  const slots: { start: Date; end: Date }[] = [];
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (let day = 0; day < daysForward; day++) {
    const dayStart = new Date(now.getTime() + day * DAY_MS);
    dayStart.setHours(8, 0, 0, 0); // Start at 8 AM
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    dayEnd.setHours(22, 0, 0, 0); // End at 10 PM

    // Filter events for this day
    const dayEvents = events.filter(
      (e) => e.start >= dayStart && e.start < dayEnd
    );

    // Sort by start time
    dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find gaps between events
    let cursor = dayStart;
    for (const event of dayEvents) {
      if (event.start > cursor) {
        const gap = event.start.getTime() - cursor.getTime();
        if (gap >= minSlotMinutes * 60 * 1000) {
          slots.push({
            start: new Date(cursor),
            end: new Date(event.start.getTime() - 30 * 60 * 1000), // 30 min before event
          });
        }
      }
      cursor = new Date(Math.max(cursor.getTime(), event.end.getTime()));
    }

    // Gap after last event
    if (cursor < dayEnd) {
      const gap = dayEnd.getTime() - cursor.getTime();
      if (gap >= minSlotMinutes * 60 * 1000) {
        slots.push({
          start: new Date(cursor),
          end: new Date(dayEnd.getTime() - 30 * 60 * 1000),
        });
      }
    }
  }

  return slots;
}
