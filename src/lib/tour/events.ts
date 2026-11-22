import {
  type EventInput,
  eventSchema,
  SESSION_PATTERN,
} from "@/lib/validacoes/evento";

// Sends visit events from the browser (issue #67). In the background: never
// blocks or breaks the tour (a failed send is just lost).

const SESSION_KEY = "vitrine3d:sessao";
let memorySession: string | null = null;

/**
 * Random id without personal data (32 hex digits). `crypto.randomUUID` only
 * exists on HTTPS (and localhost); `getRandomValues` works on plain HTTP too
 * (e.g. testing on the phone at http://<pc-ip>:3000).
 */
function newSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The anonymous id of this browser, kept in localStorage (no tracking
 * cookie). Private window or storage blocked: one id per page load.
 */
export function sessionId(): string {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved && SESSION_PATTERN.test(saved)) return saved;
    const created = newSessionId();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    memorySession ??= newSessionId();
    return memorySession;
  }
}

const REPEAT_MS = 1_000;
let last = { key: "", at: 0 };

/**
 * Records an event. The same event again within a second (a double tap,
 * React mounting twice in development) is sent once; a real return later
 * counts. `beacon`: when the page is closing, the browser delivers it even
 * after the page is gone. Never throws: tracking must not break the tour.
 */
export function track(
  event: Omit<EventInput, "sessaoId">,
  { beacon = false }: { beacon?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  try {
    send(event, beacon);
  } catch {
    // Lost event; the tour goes on.
  }
}

function send(event: Omit<EventInput, "sessaoId">, beacon: boolean) {
  const key = JSON.stringify(event);
  const now = Date.now();
  if (event.tipo !== "saiu" && key === last.key && now - last.at < REPEAT_MS)
    return;
  last = { key, at: now };

  const payload = { ...event, sessaoId: sessionId() };
  if (!eventSchema.safeParse(payload).success) return; // a bug, not the visitor
  const body = JSON.stringify(payload);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/eventos",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/eventos", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => {});
}

/** Lets a test start from a clean state. */
export function resetTracking() {
  last = { key: "", at: 0 };
  memorySession = null;
}
