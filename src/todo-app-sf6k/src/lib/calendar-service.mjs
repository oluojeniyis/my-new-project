const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const AUTH_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "UNAUTHORIZED",
  "AUTHENTICATION_REQUIRED",
  "INSUFFICIENT_PERMISSIONS",
]);

function localDate(year, month, day, hour, minute) {
  const date = new Date(year, month, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    throw new RangeError("The requested date or time is invalid in the local time zone.");
  }
  return date;
}

function parseTime(value, defaultHour) {
  const match = value.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return { hour: defaultHour, minute: 0 };

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59) throw new RangeError("Minutes must be between 00 and 59.");

  if (meridiem) {
    if (hour < 1 || hour > 12) throw new RangeError("Use an hour from 1 to 12 with AM or PM.");
    hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  } else if (hour > 23) {
    throw new RangeError("Use a 24-hour time from 0 to 23.");
  }
  return { hour, minute };
}

function dayOffset(now, offset) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + offset);
  return date;
}

export function parseNaturalDate(value, { now = new Date(), defaultHour = 9 } = {}) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("A natural-language date string is required.");
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("The reference date must be a valid Date.");
  }
  if (!Number.isInteger(defaultHour) || defaultHour < 0 || defaultHour > 23) {
    throw new RangeError("The default hour must be an integer from 0 to 23.");
  }

  const input = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/i.test(input)) {
    const explicitDate = new Date(input);
    if (Number.isNaN(explicitDate.getTime())) throw new RangeError("The ISO date-time is invalid.");
    return explicitDate.toISOString();
  }

  let date;
  let remainder = input;
  const isoDate = input.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]) - 1;
    const day = Number(isoDate[3]);
    date = localDate(year, month, day, 0, 0);
    remainder = isoDate[4];
  } else {
    const relativeDays = input.match(/\bin\s+(\d+)\s+days?\b/i);
    const weekday = input.match(/\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
    const relativeWord = input.match(/\b(today|tomorrow)\b/i);

    if (relativeDays) {
      date = dayOffset(now, Number(relativeDays[1]));
      remainder = input.replace(relativeDays[0], "");
    } else if (weekday) {
      const target = WEEKDAYS[weekday[1].toLowerCase()];
      const difference = (target - now.getDay() + 7) % 7 || 7;
      date = dayOffset(now, difference);
      remainder = input.replace(weekday[0], "");
    } else if (relativeWord) {
      date = dayOffset(now, relativeWord[1].toLowerCase() === "tomorrow" ? 1 : 0);
      remainder = input.replace(relativeWord[0], "");
    } else {
      throw new RangeError("Use today, tomorrow, in N days, a weekday, or YYYY-MM-DD.");
    }
  }

  const { hour, minute } = parseTime(remainder, defaultHour);
  return localDate(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).toISOString();
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEventReminder(task, naturalDate, {
  now = new Date(),
  durationMinutes = 30,
  reminderMinutes = 10,
  defaultHour = 9,
} = {}) {
  if (!task || typeof task.id !== "string" || typeof task.text !== "string") {
    throw new TypeError("A task with a string id and text is required.");
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
    throw new RangeError("Event duration must be a positive number of minutes.");
  }
  if (!Number.isInteger(reminderMinutes) || reminderMinutes < 0) {
    throw new RangeError("Reminder lead time must be a non-negative number of minutes.");
  }

  const start = parseNaturalDate(naturalDate, { now, defaultHour });
  const end = new Date(new Date(start).getTime() + durationMinutes * 60_000).toISOString();
  return {
    id: makeId(),
    summary: task.text,
    start: { dateTime: start },
    end: { dateTime: end },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: reminderMinutes }],
    },
    extendedProperties: { private: { orbitTaskId: task.id } },
  };
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsTimestamp(isoString) {
  return new Date(isoString).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function serializeReminderAsIcs(reminder) {
  const uid = reminder.extendedProperties?.private?.orbitTaskId ?? reminder.id;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orbit//Calendar integration//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}@orbit.local`,
    `DTSTAMP:${icsTimestamp(new Date().toISOString())}`,
    `DTSTART:${icsTimestamp(reminder.start.dateTime)}`,
    `DTEND:${icsTimestamp(reminder.end.dateTime)}`,
    `SUMMARY:${escapeIcs(reminder.summary)}`,
    `DESCRIPTION:${escapeIcs("Orbit task reminder")}`,
    "BEGIN:VALARM",
    `TRIGGER:-PT${reminder.reminders.overrides[0].minutes}M`,
    "ACTION:DISPLAY",
    "DESCRIPTION:Orbit task reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function isAuthorizationError(error) {
  const code = String(error?.code ?? "").toUpperCase();
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  const reason = error?.errors?.[0]?.reason;
  return status === 401 || status === 403 ||
    AUTH_ERROR_CODES.has(code) ||
    reason === "authError" ||
    reason === "insufficientPermissions";
}

function eventDate(event) {
  if (typeof event.start?.date === "string") return event.start.date;
  const dateTime = event.start?.dateTime;
  if (typeof dateTime !== "string") return undefined;
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createCalendarChangeHandler({ getTaskById, onTaskUpdate }) {
  if (typeof getTaskById !== "function" || typeof onTaskUpdate !== "function") {
    throw new TypeError("getTaskById and onTaskUpdate callbacks are required.");
  }

  return async function handleCalendarChange(change) {
    const event = change?.event;
    const taskId = change?.taskId ?? event?.extendedProperties?.private?.orbitTaskId;
    if (typeof taskId !== "string" || !event || typeof event.id !== "string") {
      throw new TypeError("A calendar change needs an event id and its Orbit task id.");
    }
    if (change.type !== "deleted" && change.type !== "updated") {
      throw new RangeError("Calendar change type must be deleted or updated.");
    }

    const task = await getTaskById(taskId);
    if (!task) return null;

    let updatedTask;
    if (change.type === "deleted") {
      updatedTask = { ...task, calendarSyncStatus: "event-deleted" };
    } else {
      const dueDate = eventDate(event);
      updatedTask = {
        ...task,
        ...(typeof event.summary === "string" && event.summary.trim()
          ? { text: event.summary }
          : {}),
        ...(dueDate ? { dueDate } : {}),
        calendarEventId: event.id,
        calendarSyncStatus: "event-modified",
      };
    }

    await onTaskUpdate(updatedTask, { type: change.type, event });
    return updatedTask;
  };
}

export function createCalendarIntegrationService({ provider } = {}) {
  return {
    async createReminder(task, naturalDate, options = {}) {
      const reminder = createEventReminder(task, naturalDate, options);
      if (provider && typeof options.accessToken === "string" && options.accessToken) {
        try {
          const event = await provider.createEvent(reminder, { accessToken: options.accessToken });
          return {
            mode: "provider",
            reminder,
            event,
            providerEventId: event?.id,
          };
        } catch (error) {
          if (!isAuthorizationError(error)) throw error;
          return {
            mode: "ics",
            authorizationRequired: true,
            reminder,
            fileName: `${task.id}-reminder.ics`,
            ics: serializeReminderAsIcs(reminder),
          };
        }
      }

      return {
        mode: "ics",
        authorizationRequired: Boolean(provider),
        reminder,
        fileName: `${task.id}-reminder.ics`,
        ics: serializeReminderAsIcs(reminder),
      };
    },

    watchChanges({ getTaskById, onTaskUpdate }) {
      if (!provider || typeof provider.subscribeToChanges !== "function") {
        throw new Error("This calendar provider does not support change notifications.");
      }
      const handler = createCalendarChangeHandler({ getTaskById, onTaskUpdate });
      return provider.subscribeToChanges(handler);
    },
  };
}
