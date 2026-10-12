"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import OrbitCanvas from "./orbit-canvas";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "active" | "completed";
type Theme = "light" | "dark" | "neon" | "glass";
type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
  dueTime?: string;
  calendarEventId?: string;
  calendarSyncStatus?: string;
};
type Modal = { kind: "task"; id?: string } | { kind: "account" } | null;

const TASKS_KEY = "orbit.tasks.v1";
const THEME_KEY = "orbit.theme.v1";
const themes: Theme[] = ["light", "dark", "neon", "glass"];
const priorities: Priority[] = ["low", "medium", "high"];

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function starterTasks(): Task[] {
  return [
    { id: makeId(), text: "Shape the launch story for the new product", completed: false, priority: "high", dueDate: dateOffset(0) },
    { id: makeId(), text: "Review feedback from the design sync", completed: true, priority: "medium", dueDate: dateOffset(-1) },
    { id: makeId(), text: "Make space for a proper lunch break", completed: false, priority: "low", dueDate: dateOffset(1) },
  ];
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours <= 23 && minutes <= 59;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return typeof task.id === "string" && typeof task.text === "string" &&
    typeof task.completed === "boolean" && priorities.includes(task.priority as Priority);
}

function calendarUrl(task: Task) {
  if (task.dueTime) {
    const start = new Date(`${task.dueDate}T${task.dueTime}:00`);
    const end = new Date(start.getTime() + 30 * 60_000);
    const stamp = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}00`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: task.text,
      dates: `${stamp(start)}/${stamp(end)}`,
      details: `Orbit task · ${task.priority} priority`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
  const next = new Date(`${task.dueDate}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const endDate = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.text,
    dates: `${task.dueDate.replaceAll("-", "")}/${endDate}`,
    details: `Orbit task · ${task.priority} priority`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function Icon({ name }: { name: "orbit" | "grid" | "list" | "clock" | "check" | "spark" | "plus" | "edit" | "delete" | "calendar" | "close" | "arrow" }) {
  const paths: Record<typeof name, React.ReactNode> = {
    orbit: <><circle cx="12" cy="12" r="3" fill="currentColor" /><ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-35 12 12)" /><circle cx="18.6" cy="7.3" r="1.4" fill="currentColor" /></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="m3.5 6 .8.8L5.8 5M3.5 12l.8.8 1.5-1.8M3.5 18l.8.8 1.5-1.8" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.8-5" /></>,
    spark: <><path d="m10 2 1.6 5.2L17 9l-5.4 1.8L10 16l-1.6-5.2L3 9l5.4-1.8L10 2Z" /><path d="m16 13 .8 2.2L19 16l-2.2.8L16 19l-.8-2.2L13 16l2.2-.8L16 13Z" /></>,
    plus: <path d="M10 4v12M4 10h12" />,
    edit: <><path d="m13.5 5.5 5 5M4 20l4.1-.9L19 8.2a2.1 2.1 0 0 0-3-3L5.1 16.1 4 20Z" /></>,
    delete: <><path d="M4 7h12M9 7V4h4v3m2 0-.7 12H6.7L6 7" /><path d="M9 10v6m3-6v6" /></>,
    calendar: <><rect x="3.5" y="4.5" width="13" height="12" rx="2" /><path d="M7 3v3M13 3v3M3.5 8.5h13" /></>,
    close: <path d="m5 5 10 10M15 5 5 15" />,
    arrow: <><path d="M3 8h10M8 3l5 5-5 5" /></>,
  };
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [theme, setTheme] = useState<Theme>("dark");
  const [modal, setModal] = useState<Modal>(null);
  const [taskName, setTaskName] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [accountMode, setAccountMode] = useState<"signin" | "signup">("signin");
  const [feedback, setFeedback] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let loadedTasks = starterTasks();
      let message = "";
      try {
        const stored = localStorage.getItem(TASKS_KEY);
        if (stored !== null) {
          const parsed: unknown = JSON.parse(stored);
          if (!Array.isArray(parsed) || !parsed.every(isTask)) throw new Error("Invalid task data");
          loadedTasks = parsed.map((task) => ({
            ...task,
            text: task.text.slice(0, 200),
            priority: priorities.includes(task.priority) ? task.priority : "medium",
            dueDate: validDate(task.dueDate) ? task.dueDate : "",
              dueTime: validTime(task.dueTime) ? task.dueTime : undefined,
            }));
        } else {
          localStorage.setItem(TASKS_KEY, JSON.stringify(loadedTasks));
        }
      } catch {
        message = "Saved tasks could not be read or browser storage is unavailable. Starter tasks are shown; changes may not persist.";
      }
      setTasks(loadedTasks);
      setStorageMessage(message);
      try {
        const storedTheme = localStorage.getItem(THEME_KEY);
        if (themes.includes(storedTheme as Theme)) setTheme(storedTheme as Theme);
      } catch {
        setStorageMessage("Appearance settings are unavailable in this browser.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
  }, [theme, ready]);

  function saveTasks(nextTasks: Task[]) {
    setTasks(nextTasks);
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
      setStorageMessage("");
    } catch {
      setStorageMessage("Your changes could not be saved in this browser and may be lost when you close this page.");
    }
  }

  function updateTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
      setStorageMessage("");
    } catch {
      setStorageMessage("Appearance could not be saved. Browser storage may be unavailable.");
    }
  }

  useEffect(() => {
    if (!modal) return;
    const focusTarget = modal.kind === "task" ? nameInput.current : emailInput.current;
    focusTarget?.focus();
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closeModal();
      if (event.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>("[data-dialog]");
        const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  function rememberFocus() {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function closeModal() {
    setModal(null);
    setFeedback("");
    requestAnimationFrame(() => restoreFocus.current?.focus());
  }

  function openTaskDialog(id?: string) {
    rememberFocus();
    const task = tasks.find((item) => item.id === id);
    setTaskName(task?.text ?? "");
    setPriority(task?.priority ?? "medium");
    setDueDate(task?.dueDate ?? "");
    setModal({ kind: "task", id });
  }

  function openAccountDialog() {
    rememberFocus();
    setAccountMode("signin");
    setFeedback("");
    setModal({ kind: "account" });
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = taskName.trim();
    if (!text) {
      notify("Enter a task name before saving.");
      nameInput.current?.focus();
      return;
    }
    if (modal?.kind !== "task") return;
    if (modal.id) {
      saveTasks(tasks.map((task) => task.id === modal.id ? { ...task, text: text.slice(0, 200), priority, dueDate } : task));
      notify("Task updated.");
    } else {
      saveTasks([{ id: makeId(), text: text.slice(0, 200), priority, dueDate, completed: false }, ...tasks]);
      notify("Task added.");
    }
    closeModal();
  }

  function onModalKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) event.stopPropagation();
  }

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - activeCount;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const highPriorityCount = tasks.filter((task) => !task.completed && task.priority === "high").length;
  const visibleTasks = tasks.filter((task) => filter === "all" || (filter === "active" ? !task.completed : task.completed));
  const focusTask = tasks.filter((task) => !task.completed).sort((a, b) => {
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority] || (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  })[0];

  function convertStickyNote(note: { id: string; text: string }, date: string, time: string) {
    const text = note.text.trim().slice(0, 200) || "Untitled note";
    saveTasks([{
      id: makeId(),
      text,
      completed: false,
      priority: "medium",
      dueDate: date,
      dueTime: time,
    }, ...tasks]);
    notify("Note added to today’s timeline.");
  }

  function applyCalendarChange(change: { type: "updated" | "deleted"; event: { id: string; summary?: string; start?: { date?: string; dateTime?: string }; extendedProperties?: { private?: { orbitTaskId?: string } } } }) {
    const event = change.event;
    const taskId = event.extendedProperties?.private?.orbitTaskId;
    const matching = tasks.find((task) => task.calendarEventId === event.id || task.id === taskId);
    if (!matching) return;
    if (change.type === "deleted") {
      saveTasks(tasks.map((task) => task.id === matching.id ? { ...task, calendarSyncStatus: "event-deleted" } : task));
      return;
    }
    const start = event.start?.dateTime ? new Date(event.start.dateTime) : null;
    const date = event.start?.date ?? (start && !Number.isNaN(start.getTime())
      ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
      : undefined);
    const time = start && !Number.isNaN(start.getTime())
      ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      : undefined;
    saveTasks(tasks.map((task) => task.id === matching.id ? {
      ...task,
      ...(event.summary?.trim() ? { text: event.summary.slice(0, 200) } : {}),
      ...(date ? { dueDate: date } : {}),
      ...(time ? { dueTime: time } : event.start?.date ? { dueTime: undefined } : {}),
      calendarEventId: event.id,
      calendarSyncStatus: "event-modified",
    } : task));
  }

  function exportCalendar() {
    const dated = tasks.filter((task) => task.dueDate);
    if (!dated.length) {
      notify("Add a due date to a task before exporting.");
      return;
    }
    const events = dated.map((task) => {
      if (task.dueTime) {
        const start = new Date(`${task.dueDate}T${task.dueTime}:00`);
        const end = new Date(start.getTime() + 30 * 60_000);
        const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        return `BEGIN:VEVENT\nUID:${task.id}@orbit.local\nDTSTAMP:${stamp(new Date())}\nDTSTART:${stamp(start)}\nDTEND:${stamp(end)}\nSUMMARY:${escapeCalendarText(task.text)}\nDESCRIPTION:${escapeCalendarText(`Orbit task · ${task.priority} priority`)}\nBEGIN:VALARM\nTRIGGER:-PT10M\nACTION:DISPLAY\nDESCRIPTION:${escapeCalendarText(task.text)}\nEND:VALARM\nEND:VEVENT`;
      }
      const next = new Date(`${task.dueDate}T00:00:00`);
      next.setDate(next.getDate() + 1);
      const end = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
      return `BEGIN:VEVENT\nUID:${task.id}@orbit.local\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}\nDTSTART;VALUE=DATE:${task.dueDate.replaceAll("-", "")}\nDTEND;VALUE=DATE:${end}\nSUMMARY:${escapeCalendarText(task.text)}\nDESCRIPTION:${escapeCalendarText(`Orbit task · ${task.priority} priority`)}\nEND:VEVENT`;
    });
    try {
      const blob = new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Orbit//Task list//EN\n${events.join("\n")}\nEND:VCALENDAR`], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "orbit-tasks.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("Calendar file downloaded.");
    } catch {
      notify("The calendar file could not be created in this browser.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Orbit home">
          <span className="brand-mark"><Icon name="orbit" /></span>
          <span className="brand-name">orbit<span> / workspace</span></span>
        </Link>
        <div className="topbar-right">
          <span className="system-status"><span className="status-dot" />All systems focused</span>
          <label className="theme-control"><span>Appearance</span>
            <select className="theme-select" value={theme} onChange={(event) => updateTheme(event.target.value as Theme)} aria-label="Choose appearance">
              <option value="light">Light</option><option value="dark">Dark</option><option value="neon">Neon</option><option value="glass">Glass</option>
            </select>
          </label>
          <button className="account-button" type="button" onClick={openAccountDialog}>Sign in</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Workspace navigation">
          <div>
            <p className="nav-label">Workspace</p>
            <nav aria-label="Task views"><ul className="nav-list">
              <li><button className="nav-link" type="button" onClick={() => setFilter("all")} aria-current={filter === "all" ? "page" : undefined}><Icon name="grid" />Overview</button></li>
              <li><button className="nav-link" type="button" onClick={() => setFilter("all")}><Icon name="list" />My tasks<span className="nav-count">{tasks.length}</span></button></li>
              <li><button className="nav-link" type="button" onClick={() => setFilter("active")} aria-current={filter === "active" ? "page" : undefined}><Icon name="clock" />In progress</button></li>
              <li><button className="nav-link" type="button" onClick={() => setFilter("completed")} aria-current={filter === "completed" ? "page" : undefined}><Icon name="check" />Completed</button></li>
            </ul></nav>
          </div>
          <div className="sidebar-note">
            <span className="eyebrow"><Icon name="spark" />Orbit insight</span>
            <p><strong>Small steps still move you forward.</strong> Your tasks stay in this browser. Calendar connections are not configured.</p>
            <button className="sidebar-link" type="button" onClick={openAccountDialog}>Explore connections <Icon name="arrow" /></button>
          </div>
        </aside>

        <main>
          <section className="page-heading">
            <div>
              <p className="date-line">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
              <h1>Make room for focus.</h1>
              <p className="heading-caption">You have <strong>{activeCount} {activeCount === 1 ? "priority" : "priorities"}</strong> on your plate today.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => openTaskDialog()}><Icon name="plus" />Create a task</button>
          </section>

          <section className="overview-grid" aria-label="Daily overview">
            <article className="overview-card">
              <div className="card-heading"><h2>Today&apos;s momentum</h2><span className="today-label"><span className="status-dot" />LIVE OVERVIEW</span></div>
              <div className="overview-bottom">
                <div className="metric"><strong>{completedCount}</strong><span>of {tasks.length} tasks complete</span></div>
                <div className="progress-block">
                  <div className="progress-label"><span>Daily progress</span><strong>{progress}%</strong></div>
                  <div className="progress-track" role="progressbar" aria-label="Daily task progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
              </div>
              <div className="micro-stats"><span><i className="legend-dot" />{activeCount} in progress</span><span><i className="legend-dot orange" />{highPriorityCount} high priority</span></div>
            </article>
            <article className="focus-card" aria-labelledby="focusTitle">
              <span className="eyebrow"><Icon name="spark" />AI focus companion</span>
              <h2 id="focusTitle">{focusTask ? "A good place to start." : "A little clarity goes a long way."}</h2>
              <p aria-live="polite">{focusTask ? `Try “${focusTask.text}” first — your locally generated suggestion prioritizes urgency and due date.` : "You are all caught up. Add a task when you are ready for your next step."}</p>
            </article>
          </section>

          <OrbitCanvas tasks={tasks} onConvert={convertStickyNote} onCalendarChange={applyCalendarChange} />

          <section aria-labelledby="tasksHeading">
            <div className="section-heading">
              <div className="section-title"><h2 id="tasksHeading">Your tasks</h2><span>{visibleTasks.length} {visibleTasks.length === 1 ? "item" : "items"}</span></div>
              <div className="calendar-actions"><button className="calendar-export" type="button" onClick={exportCalendar}>Export .ics</button>
                <div className="filter-list" role="group" aria-label="Filter tasks">
                  {(["all", "active", "completed"] as Filter[]).map((value) => <button key={value} className="filter-button" type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}>{value[0].toUpperCase() + value.slice(1)}</button>)}
                </div>
              </div>
            </div>
            <p className="calendar-export-note">Add dated tasks to Google Calendar individually, or export them as a calendar file. No account connection is configured.</p>
            <ul className="task-list" aria-label="Your tasks">
              {visibleTasks.map((task) => {
                const overdue = !!task.dueDate && task.dueDate < dateOffset(0) && !task.completed;
                return <li className={`task-item${task.completed ? " completed" : ""}`} key={task.id}>
                  <input className="task-check" type="checkbox" checked={task.completed} onChange={() => saveTasks(tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))} aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.text}`} />
                  <div className="task-main"><span className="task-title">{task.text}</span><div className="task-subline">
                    <span className={`priority ${task.priority}`}>{task.priority}</span>
                    {task.dueDate && <span className={`due-date${overdue ? " overdue" : ""}`}><Icon name="calendar" />{overdue ? "Overdue · " : "Due "}{displayDate(task.dueDate)}</span>}
                    {task.dueTime && <span className="due-date">{task.dueTime}</span>}
                    {task.calendarSyncStatus === "event-deleted" && <span className="sync-state">Calendar event removed</span>}
                    {task.calendarSyncStatus === "event-modified" && <span className="sync-state">Calendar updated</span>}
                  </div></div>
                  <div className="task-actions">
                    {task.dueDate && <a className="icon-button calendar-task-link" href={calendarUrl(task)} target="_blank" rel="noreferrer" aria-label={`Add ${task.text} to Google Calendar`} title="Add to Google Calendar"><Icon name="calendar" /></a>}
                    <button className="icon-button" type="button" onClick={() => openTaskDialog(task.id)} aria-label={`Edit ${task.text}`} title="Edit task"><Icon name="edit" /></button>
                    <button className="icon-button delete" type="button" onClick={() => { saveTasks(tasks.filter((item) => item.id !== task.id)); notify("Task deleted."); }} aria-label={`Delete ${task.text}`} title="Delete task"><Icon name="delete" /></button>
                  </div>
                </li>;
              })}
            </ul>
            {ready && visibleTasks.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><h3>{tasks.length ? "Nothing in this view." : "A fresh start."}</h3><p>{tasks.length ? "Try another filter to find your tasks." : "Add your first task and make today count."}</p></div>}
            <p className="storage-message" role="status" aria-live="polite">{storageMessage}</p>
          </section>
        </main>
      </div>

      {modal?.kind === "task" && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={onModalKeyDown}>
        <section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="taskDialogTitle" data-dialog>
          <div className="dialog-heading"><div><h2 id="taskDialogTitle">{modal.id ? "Edit task" : "Create a task"}</h2><p>Give your next step a name. You can refine it later.</p></div><button className="dialog-close" type="button" onClick={closeModal} aria-label="Close dialog"><Icon name="close" /></button></div>
          <form onSubmit={saveTask}>
            <label className="field-label" htmlFor="taskName">Task name</label>
            <input ref={nameInput} className="task-input" id="taskName" value={taskName} onChange={(event) => setTaskName(event.target.value)} maxLength={200} autoComplete="off" placeholder="e.g. Prepare the project update" required />
            <div className="form-options">
              <div><label className="field-label" htmlFor="priority">Priority</label><select className="field-select" id="priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></div>
              <div><label className="field-label" htmlFor="dueDate">Due date <span className="optional">(optional)</span></label><input className="field-date" id="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
            </div>
            <div className="dialog-actions"><button className="secondary-button" type="button" onClick={closeModal}>Cancel</button><button className="primary-button" type="submit">{modal.id ? "Save changes" : "Add to my list"}</button></div>
          </form>
        </section>
      </div>}

      {modal?.kind === "account" && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }} onKeyDown={onModalKeyDown}>
        <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="accountTitle" data-dialog>
          <div className="dialog-heading"><div><h2 id="accountTitle">Welcome to Orbit</h2><p>Sign in or create an account.</p></div><button className="dialog-close" type="button" onClick={closeModal} aria-label="Close account dialog"><Icon name="close" /></button></div>
          <div className="account-tabs" role="group" aria-label="Choose account action">
            <button className="account-tab" type="button" aria-pressed={accountMode === "signin"} onClick={() => { setAccountMode("signin"); setFeedback(""); }}>Sign in</button>
            <button className="account-tab" type="button" aria-pressed={accountMode === "signup"} onClick={() => { setAccountMode("signup"); setFeedback(""); }}>Create account</button>
          </div>
          <p className="account-copy">Account access is a preview in this build. No credentials will be sent or stored.</p>
          <form onSubmit={(event) => { event.preventDefault(); setFeedback("Authentication is not configured. No account was created and no credentials were sent."); }}>
            <label className="field-label" htmlFor="accountEmail">Email address</label><input ref={emailInput} className="task-input" id="accountEmail" type="email" autoComplete="email" required placeholder="you@example.com" />
            <label className="field-label account-password-label" htmlFor="accountPassword">Password</label><input className="task-input" id="accountPassword" type="password" autoComplete={accountMode === "signup" ? "new-password" : "current-password"} required minLength={8} placeholder="At least 8 characters" />
            <button className="primary-button account-submit" type="submit">{accountMode === "signin" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="account-section-label">Calendar connections</p>
          <div className="provider-list" aria-label="Calendar providers">
            {["Google Calendar", "Calendly", "Microsoft Calendar"].map((provider) => <button key={provider} className="provider-button" type="button" onClick={() => setFeedback(`${provider} connection is not configured. A backend and provider OAuth credentials are required; no connection was made.`)}><span>{provider}</span><span>SETUP REQUIRED</span></button>)}
          </div>
          {feedback && <p className="account-feedback" role="status" aria-live="polite">{feedback}</p>}
          <p className="account-disclaimer">Live sign-in and two-way calendar sync need a configured backend and provider OAuth credentials. No connection is being made here. You can still add dated tasks to Google Calendar individually or export an .ics file.</p>
        </section>
      </div>}

      <div className={`toast${toast ? " visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
