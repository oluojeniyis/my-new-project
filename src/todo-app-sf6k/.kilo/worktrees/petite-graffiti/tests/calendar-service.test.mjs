import assert from "node:assert/strict";
import test from "node:test";
import {
  createCalendarChangeHandler,
  createCalendarIntegrationService,
  createEventReminder,
  parseNaturalDate,
  serializeReminderAsIcs,
} from "../src/lib/calendar-service.mjs";

const now = new Date(2026, 8, 30, 12, 0);
const task = { id: "task-42", text: "Review, then share; notes" };

test("parses relative dates and 12-hour time in the local timezone", () => {
  const parsed = new Date(parseNaturalDate("Tomorrow at 3 PM", { now }));
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 9);
  assert.equal(parsed.getDate(), 1);
  assert.equal(parsed.getHours(), 15);
  assert.equal(parsed.getMinutes(), 0);
});

test("accepts explicit ISO timestamps and rejects unsupported or impossible dates", () => {
  assert.equal(
    parseNaturalDate("2026-10-01T15:00:00Z", { now }),
    "2026-10-01T15:00:00.000Z",
  );
  assert.throws(() => parseNaturalDate("2026-02-30", { now }), RangeError);
  assert.throws(() => parseNaturalDate("sometime soon", { now }), RangeError);
});

test("creates a reminder event with task linkage and configured popup reminder", () => {
  const reminder = createEventReminder(task, "Tomorrow at 3 PM", {
    now,
    durationMinutes: 45,
    reminderMinutes: 15,
  });
  assert.equal(reminder.summary, task.text);
  assert.equal(reminder.extendedProperties.private.orbitTaskId, task.id);
  assert.equal(reminder.reminders.overrides[0].minutes, 15);
  assert.equal(
    new Date(reminder.end.dateTime).getTime() - new Date(reminder.start.dateTime).getTime(),
    45 * 60_000,
  );
});

test("falls back to a safe iCalendar reminder when provider authorization is unavailable", async () => {
  const service = createCalendarIntegrationService({
    provider: {
      async createEvent() {
        const error = new Error("Insufficient calendar permissions");
        error.status = 403;
        throw error;
      },
    },
  });
  const result = await service.createReminder(task, "Tomorrow at 3 PM", {
    now,
    accessToken: "expired-token",
  });

  assert.equal(result.mode, "ics");
  assert.equal(result.authorizationRequired, true);
  assert.equal(result.fileName, "task-42-reminder.ics");
  assert.match(result.ics, /BEGIN:VALARM/);
  assert.match(result.ics, /SUMMARY:Review\\, then share\\; notes/);
});

test("exports iCalendar when no provider token is present and links with an authorized provider", async () => {
  const provider = {
    async createEvent(reminder, { accessToken }) {
      assert.equal(accessToken, "valid-token");
      return { id: "provider-event-1", summary: reminder.summary };
    },
  };
  const service = createCalendarIntegrationService({ provider });
  const fallback = await service.createReminder(task, "Tomorrow", { now });
  assert.equal(fallback.mode, "ics");
  assert.equal(fallback.authorizationRequired, true);

  const linked = await service.createReminder(task, "Tomorrow", {
    now,
    accessToken: "valid-token",
  });
  assert.equal(linked.mode, "provider");
  assert.equal(linked.providerEventId, "provider-event-1");
});

test("does not hide non-authorization provider failures", async () => {
  const service = createCalendarIntegrationService({
    provider: { async createEvent() { throw new Error("Network unavailable"); } },
  });
  await assert.rejects(
    service.createReminder(task, "Tomorrow", { now, accessToken: "token" }),
    /Network unavailable/,
  );
});

test("calendar changes update task sync status and reflect edits without completing it", async () => {
  const updates = [];
  const currentTask = { ...task, completed: false, dueDate: "2026-10-01" };
  const handleChange = createCalendarChangeHandler({
    async getTaskById(id) { return id === task.id ? currentTask : null; },
    async onTaskUpdate(updatedTask) { updates.push(updatedTask); },
  });

  const modified = await handleChange({
    type: "updated",
    event: {
      id: "event-9",
      summary: "Updated task title",
      start: { date: "2026-10-03" },
      extendedProperties: { private: { orbitTaskId: task.id } },
    },
  });
  assert.equal(modified.text, "Updated task title");
  assert.equal(modified.dueDate, "2026-10-03");
  assert.equal(modified.completed, false);
  assert.equal(modified.calendarSyncStatus, "event-modified");

  const deleted = await handleChange({
    type: "deleted",
    event: { id: "event-9", extendedProperties: { private: { orbitTaskId: task.id } } },
  });
  assert.equal(deleted.calendarSyncStatus, "event-deleted");
  assert.equal(deleted.completed, false);
  assert.equal(updates.length, 2);
});

test("watchChanges delegates normalized change subscription to a provider adapter", () => {
  let subscribedHandler;
  const unsubscribe = () => {};
  const service = createCalendarIntegrationService({
    provider: {
      subscribeToChanges(handler) {
        subscribedHandler = handler;
        return unsubscribe;
      },
    },
  });
  const getTaskById = async () => null;
  const onTaskUpdate = async () => {};
  assert.equal(service.watchChanges({ getTaskById, onTaskUpdate }), unsubscribe);
  assert.equal(typeof subscribedHandler, "function");
});

test("iCalendar export has event times and escaped text", () => {
  const reminder = createEventReminder(task, "2026-10-01 at 3 PM", { now });
  const ics = serializeReminderAsIcs(reminder);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/);
  assert.match(ics, /SUMMARY:Review\\, then share\\; notes/);
});
