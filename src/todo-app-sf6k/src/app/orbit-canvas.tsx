"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CanvasNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  color: "butter" | "lavender" | "mint" | "peach";
};

type ArchivedNote = CanvasNote & { archivedAt: string };
type CalendarEvent = {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  source?: string;
  extendedProperties?: { private?: { orbitTaskId?: string } };
};
export type OrbitTimelineTask = {
  id: string;
  text: string;
  dueDate: string;
  dueTime?: string;
  completed: boolean;
  calendarEventId?: string;
  calendarSyncStatus?: string;
};
type CalendarChange = { type: "updated" | "deleted"; event: CalendarEvent };
type Props = {
  tasks: OrbitTimelineTask[];
  onConvert: (note: CanvasNote, dueDate: string, dueTime: string) => void;
  onCalendarChange: (change: CalendarChange) => void;
};

const STORAGE_KEY = "orbit.canvas.v1";
const EVENTS_KEY = "orbit.calendar.events.v1";
const noteColors: CanvasNote["color"][] = ["butter", "lavender", "mint", "peach"];
const isoToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const nextQuarter = () => {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
};
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function isNote(value: unknown): value is CanvasNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<CanvasNote>;
  return typeof note.id === "string" && typeof note.text === "string" &&
    typeof note.x === "number" && typeof note.y === "number" &&
    typeof note.rotation === "number" && noteColors.includes(note.color as CanvasNote["color"]);
}

function validCalendarEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CalendarEvent>;
  return typeof event.id === "string" && typeof event.summary === "string" &&
    !!event.start && (typeof event.start.date === "string" || typeof event.start.dateTime === "string");
}

function calendarEventDate(event: CalendarEvent) {
  if (event.start.date) return { date: event.start.date, time: "" };
  const start = new Date(event.start.dateTime ?? "");
  if (Number.isNaN(start.getTime())) return null;
  return {
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
  };
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    new Date(2000, 0, 1, hours, minutes),
  );
}

export default function OrbitCanvas({ tasks, onConvert, onCalendarChange }: Props) {
  const [notes, setNotes] = useState<CanvasNote[]>([]);
  const [archive, setArchive] = useState<ArchivedNote[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [conversionDate, setConversionDate] = useState(isoToday);
  const [conversionTime, setConversionTime] = useState(() => nextQuarter().time);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const boardRef = useRef<HTMLDivElement>(null);
  const dragOverTimeline = useRef(false);
  const notesRef = useRef(notes);
  const archiveRef = useRef(archive);
  const persist = useCallback((nextNotes: CanvasNote[], nextArchive: ArchivedNote[]) => {
    setNotes(nextNotes);
    setArchive(nextArchive);
    notesRef.current = nextNotes;
    archiveRef.current = nextArchive;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        notes: nextNotes,
        archive: nextArchive.slice(-100),
        lastSweepDate: isoToday(),
      }));
      setStorageError("");
    } catch {
      setStorageError("Canvas changes could not be saved in this browser.");
    }
  }, []);

  const sweep = useCallback(() => {
    const currentNotes = notesRef.current;
    if (!currentNotes.length) return;
    const archivedAt = new Date().toISOString();
    const newlyArchived = currentNotes.map((note) => ({ ...note, archivedAt }));
    persist([], [...archiveRef.current, ...newlyArchived].slice(-100));
  }, [persist]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid canvas storage");
        const data = parsed as { notes?: unknown; archive?: unknown; lastSweepDate?: unknown };
        if (!Array.isArray(data.notes) || !data.notes.every(isNote)) throw new Error("Invalid canvas notes");
        const loadedArchive = Array.isArray(data.archive)
          ? data.archive.filter((item): item is ArchivedNote => isNote(item) && typeof (item as ArchivedNote).archivedAt === "string")
          : [];
        let loadedNotes = data.notes as CanvasNote[];
        let loadedArchiveItems = loadedArchive;
        if (data.lastSweepDate !== isoToday()) {
          const archivedAt = new Date().toISOString();
          loadedArchiveItems = [...loadedArchiveItems, ...loadedNotes.map((note) => ({ ...note, archivedAt }))].slice(-100);
          loadedNotes = [];
        }
        setNotes(loadedNotes);
        setArchive(loadedArchiveItems);
        notesRef.current = loadedNotes;
        archiveRef.current = loadedArchiveItems;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notes: loadedNotes,
          archive: loadedArchiveItems,
          lastSweepDate: isoToday(),
        }));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes: [], archive: [], lastSweepDate: isoToday() }));
      }
      const savedEvents = localStorage.getItem(EVENTS_KEY);
      if (savedEvents) {
        const parsed: unknown = JSON.parse(savedEvents);
        if (Array.isArray(parsed)) setEvents(parsed.filter(validCalendarEvent));
      }
      } catch {
        setStorageError("Canvas storage could not be read. Notes may not persist.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const lastSweepDate = stored ? (JSON.parse(stored) as { lastSweepDate?: string }).lastSweepDate : undefined;
        if (lastSweepDate && lastSweepDate !== isoToday()) sweep();
      } catch {
        setStorageError("The overnight canvas sweep could not run.");
      }
    }, 60_000);
    const checkOnFocus = () => {
      setClock(new Date());
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const lastSweepDate = stored ? (JSON.parse(stored) as { lastSweepDate?: string }).lastSweepDate : undefined;
        if (lastSweepDate && lastSweepDate !== isoToday()) sweep();
      } catch {
        setStorageError("The overnight canvas sweep could not run.");
      }
    };
    window.addEventListener("focus", checkOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkOnFocus);
    };
  }, [sweep]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== EVENTS_KEY) return;
      if (!event.newValue) {
        setEvents([]);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) setEvents(parsed.filter(validCalendarEvent));
      } catch {
        setStorageError("Calendar timeline data could not be read.");
      }
    }
    function handleCalendarEvent(customEvent: Event) {
      const change = (customEvent as CustomEvent<CalendarChange>).detail;
      if (!change?.event || typeof change.event.id !== "string") return;
      onCalendarChange(change);
      setEvents((current) => change.type === "deleted"
        ? current.filter((event) => event.id !== change.event.id)
        : [...current.filter((event) => event.id !== change.event.id), change.event]);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("orbit:calendar-change", handleCalendarEvent);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("orbit:calendar-change", handleCalendarEvent);
    };
  }, [onCalendarChange]);

  const addNote = useCallback((x: number, y: number) => {
    const index = notesRef.current.length;
    const note: CanvasNote = {
      id: makeId(),
      text: "",
      x: clamp(x, 12, 88),
      y: clamp(y, 22, 78),
      rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
      color: noteColors[index % noteColors.length],
    };
    persist([...notesRef.current, note], archiveRef.current);
    setEditingId(note.id);
  }, [persist]);

  const handleBoardDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !boardRef.current) return;
    const bounds = boardRef.current.getBoundingClientRect();
    addNote(((event.clientX - bounds.left) / bounds.width) * 100, ((event.clientY - bounds.top) / bounds.height) * 100);
  };

  const updateNote = (id: string, patch: Partial<CanvasNote>) => {
    persist(notesRef.current.map((note) => note.id === id ? { ...note, ...patch } : note), archiveRef.current);
  };

  const removeNote = (id: string) => {
    persist(notesRef.current.filter((note) => note.id !== id), archiveRef.current);
    setEditingId((current) => current === id ? null : current);
  };

  const moveDroppedNote = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/orbit-note");
    if (!id || !boardRef.current) return;
    const bounds = boardRef.current.getBoundingClientRect();
    updateNote(id, {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 12, 88),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 22, 78),
    });
    setDraggedId(null);
  };

  const dropOnTimeline = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/orbit-note");
    if (!id) return;
    dragOverTimeline.current = true;
    setDraggedId(null);
    setConversionId(id);
    const slot = nextQuarter();
    setConversionDate(slot.date);
    setConversionTime(slot.time);
  };

  const openConversionPicker = (id: string) => {
    const slot = nextQuarter();
    setConversionId(id);
    setConversionDate(slot.date);
    setConversionTime(slot.time);
  };

  const convertNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const note = notesRef.current.find((item) => item.id === conversionId);
    if (!note) return;
    onConvert(note, conversionDate, conversionTime);
    persist(notesRef.current.filter((item) => item.id !== note.id), archiveRef.current);
    setConversionId(null);
  };

  const restoreNote = (id: string) => {
    const item = archiveRef.current.find((note) => note.id === id);
    if (!item) return;
    persist([...notesRef.current, {
      id: item.id,
      text: item.text,
      x: clamp(item.x, 12, 88),
      y: clamp(item.y, 22, 78),
      rotation: item.rotation,
      color: item.color,
    }], archiveRef.current.filter((note) => note.id !== id));
  };

  const deleteArchivedNote = (id: string) => {
    persist(notesRef.current, archiveRef.current.filter((note) => note.id !== id));
  };

  const today = isoToday();
  const linkedEventIds = new Set(tasks.map((task) => task.calendarEventId).filter((id): id is string => typeof id === "string"));
  const externalEntries = events.flatMap((event) => {
    if (linkedEventIds.has(event.id)) return [];
    const start = calendarEventDate(event);
    return start?.date === today ? [{ id: event.id, title: event.summary, time: start.time, source: event.source || "Calendar", event }] : [];
  });
  const taskEntries = tasks.filter((task) => task.dueDate === today).map((task) => ({
    id: task.id,
    title: task.text,
    time: task.dueTime ?? "",
    source: task.calendarEventId ? "Synced calendar" : "Orbit task",
    completed: task.completed,
    event: null as CalendarEvent | null,
  }));
  const entries = [...taskEntries, ...externalEntries.map((entry) => ({ ...entry, completed: false }))].sort((a, b) => {
    if (!a.time) return b.time ? -1 : a.title.localeCompare(b.title);
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });
  const nextReminder = entries.find((entry) => {
    if (entry.completed || !entry.time) return false;
    const [hour, minute] = entry.time.split(":").map(Number);
    const start = new Date(clock.getFullYear(), clock.getMonth(), clock.getDate(), hour, minute);
    const minutesAway = (start.getTime() - clock.getTime()) / 60_000;
    return minutesAway >= 0 && minutesAway <= 60;
  });
  const convertingNote = notes.find((note) => note.id === conversionId);

  return (
    <section className="orbit-dual" aria-label="Orbit canvas and today timeline">
      <div className="orbit-section-heading">
        <div><span className="orbit-overline">Make space to think</span><h2>Orbit canvas</h2></div>
        <div className="orbit-canvas-actions">
          <button className="canvas-action" type="button" onClick={() => addNote(26 + (notes.length % 3) * 24, 36 + (notes.length % 2) * 22)}>＋ New note</button>
          <button className="canvas-action" type="button" onClick={sweep} disabled={!notes.length} title="Move unfinished notes to the archive">Orbital sweep</button>
        </div>
      </div>
      <div className="orbit-canvas-grid">
        <div
          className={`orbit-board${draggedId ? " is-dragging" : ""}`}
          ref={boardRef}
          onDoubleClick={handleBoardDoubleClick}
          onDragOver={(event) => event.preventDefault()}
          onDrop={moveDroppedNote}
          aria-label="Sticky note canvas. Double-click empty space to add a note."
        >
          <div className="orbit-board-hint"><span>✦</span> Double-click to capture a thought</div>
          {!notes.length && ready && <p className="orbit-board-empty">A little room for your next big idea.</p>}
          {notes.map((note) => (
            <article
              key={note.id}
              className={`sticky-note note-${note.color}${draggedId === note.id ? " is-note-dragging" : ""}`}
              style={{ left: `${note.x}%`, top: `${note.y}%`, transform: `translate(-50%, -50%) rotate(${note.rotation}deg)` }}
              draggable={editingId !== note.id}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/orbit-note", note.id);
                event.dataTransfer.effectAllowed = "move";
                dragOverTimeline.current = false;
                setDraggedId(note.id);
              }}
              onDragEnd={() => {
                if (dragOverTimeline.current) dragOverTimeline.current = false;
                else setDraggedId(null);
              }}
              onDoubleClick={(event) => { event.stopPropagation(); setEditingId(note.id); }}
              aria-label={`Sticky note: ${note.text || "New note"}. Drag to move or drop on today's timeline to schedule.`}
            >
              <div className="sticky-note-top"><span className="sticky-grip" aria-hidden="true">⠿</span><button type="button" className="sticky-delete" onClick={() => removeNote(note.id)} aria-label={`Delete note ${note.text || "New note"}`}>×</button></div>
              {editingId === note.id ? (
                <textarea
                  autoFocus
                  value={note.text}
                  maxLength={240}
                  placeholder="A thought, a spark..."
                  aria-label="Edit sticky note text"
                  onChange={(event) => updateNote(note.id, { text: event.target.value })}
                  onBlur={() => setEditingId((current) => current === note.id ? null : current)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") event.currentTarget.blur();
                    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.blur(); }
                  }}
                  onDoubleClick={(event) => event.stopPropagation()}
                />
              ) : (
                <button className="sticky-copy" type="button" onClick={() => setEditingId(note.id)} aria-label={`Edit note: ${note.text || "New note"}`}>{note.text || <span className="sticky-placeholder">Click to jot something down</span>}</button>
              )}
              <div className="sticky-note-bottom">
                <span className="sticky-drag-cue" aria-hidden="true">drag to today ↘</span>
                <button className="sticky-schedule" type="button" onClick={() => openConversionPicker(note.id)} aria-label={`Schedule note: ${note.text || "New note"}`}>Schedule</button>
              </div>
            </article>
          ))}
        </div>

        <section
          className={`orbit-timeline${draggedId ? " is-drop-target" : ""}`}
          aria-labelledby="timelineTitle"
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropOnTimeline}
        >
          <div className="timeline-heading">
            <div><span className="orbit-overline">Your day, at a glance</span><h2 id="timelineTitle">Today’s timeline</h2></div>
            <time dateTime={today}>{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(clock)}</time>
          </div>
          {nextReminder && <div className="micro-reminder" role="status" aria-live="polite"><span className="reminder-pulse" />Coming up · <strong>{nextReminder.title}</strong><span>{formatTime(nextReminder.time)}</span></div>}
          {conversionId && <form className="gravity-picker" onSubmit={convertNote}>
            <span className="gravity-label">Give “{convertingNote?.text || "your note"}” a time</span>
            <label><span className="visually-hidden">Date</span><input aria-label="Reminder date" type="date" value={conversionDate} onChange={(event) => setConversionDate(event.target.value)} required /></label>
            <label><span className="visually-hidden">Time</span><input aria-label="Reminder time" type="time" value={conversionTime} onChange={(event) => setConversionTime(event.target.value)} required /></label>
            <button className="gravity-confirm" type="submit">Add to timeline</button>
            <button className="gravity-cancel" type="button" onClick={() => setConversionId(null)}>Cancel</button>
          </form>}
          <div className="timeline-track" onDragOver={(event) => event.preventDefault()} onDrop={dropOnTimeline}>
            {!entries.length ? <div className="timeline-empty"><span>◷</span><p>Your day is open.</p><small>Drop a note here to give it a time.</small></div> : entries.map((entry) => (
              <article key={`${entry.source}-${entry.id}`} className={`timeline-entry${entry.completed ? " is-complete" : ""}${entry.event ? " from-calendar" : ""}`}>
                <time className="timeline-time">{entry.time ? formatTime(entry.time) : "Anytime"}</time>
                <span className="timeline-node" aria-hidden="true" />
                <div className="timeline-entry-copy"><strong>{entry.title}</strong><span>{entry.source}{entry.event ? " · synced" : ""}</span></div>
              </article>
            ))}
          </div>
          <div className="timeline-footer"><span><i className="timeline-legend-task" /> Orbit tasks</span><span><i className="timeline-legend-calendar" /> Linked calendar</span></div>
        </section>
      </div>
      <div className="orbit-canvas-footer">
        <p className="canvas-storage-note">{storageError || "Canvas notes are stored separately in this browser."}</p>
        <button type="button" className="archive-toggle" onClick={() => setArchiveOpen((open) => !open)} aria-expanded={archiveOpen}>
          Drawer archive <span>{archive.length}</span> <span aria-hidden="true">{archiveOpen ? "⌃" : "⌄"}</span>
        </button>
      </div>
      {archiveOpen && <section className="archive-drawer" aria-label="Drawer archive">
        {!archive.length ? <p>Your drawer is clear. Orbital sweeps keep unfinished notes here.</p> : archive.slice().reverse().map((note) => (
          <article key={`${note.id}-${note.archivedAt}`} className={`archive-note note-${note.color}`}>
            <span>{note.text || "Untitled thought"}</span><time>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(note.archivedAt))}</time>
            <button type="button" onClick={() => restoreNote(note.id)}>Restore</button>
            <button type="button" onClick={() => deleteArchivedNote(note.id)} aria-label={`Delete archived note ${note.text || "Untitled thought"}`}>×</button>
          </article>
        ))}
      </section>}
    </section>
  );
}
