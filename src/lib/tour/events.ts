import {
  type EventInput,
  eventSchema,
  SESSION_PATTERN,
} from "@/lib/validacoes/evento";

// Sends visit events from the browser (issue #67). In the background: never
// blocks or breaks the tour (a failed send is just lost).

const SESSION_KEY = "vitrine3d:sessao";
let memorySession: string | null = null;

/** Random id without personal data (letters and digits). */
function newSessionId(): string {
  return crypto.randomUUID().replaceAll("-", "");
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

let lastSent = "";

/**
 * Records an event. The same event twice in a row (a tap repeated, React
 * mounting twice in development) is sent once. `beacon`: when the page is
 * closing, the browser delivers it even after the page is gone.
 */
export function track(
  event: Omit<EventInput, "sessaoId">,
  { beacon = false }: { beacon?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  const key = JSON.stringify(event);
  if (event.tipo !== "saiu" && key === lastSent) return;
  lastSent = key;

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
  lastSent = "";
  memorySession = null;
}
