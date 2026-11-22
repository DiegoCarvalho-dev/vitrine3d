import { createRateLimiter } from "@/lib/rate-limit";
import { createAnonClient } from "@/lib/supabase/anon";
import { eventSchema } from "@/lib/validacoes/evento";

// Visit events of the public tour (issue #67). The browser posts here (fetch
// or sendBeacon); the event is validated and saved with the ANONYMOUS client,
// so the RLS still decides (published project only, room of the same
// project). Answers carry no detail: nothing to learn by probing.

const MAX_BODY = 2_000; // characters of JSON (an event is ~300)
const perIp = createRateLimiter(120);
const perSession = createRateLimiter(60);

const empty = (status: number) => new Response(null, { status });

/** Same site? Origin's host vs the host the browser asked for. */
function isSameSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin GET-like beacons may omit it
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false; // "null" (sandboxed iframe, file://) or garbage
  }
}

export async function POST(request: Request) {
  if (!isSameSite(request)) return empty(403);
  // Refuse a big body before reading it.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY * 4) {
    return empty(413);
  }

  const body = await request.text();
  if (body.length > MAX_BODY) return empty(413);
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return empty(400);
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return empty(400);
  const event = parsed.data;

  // The visitor's IP as the host platform reports it (Vercel sets
  // x-real-ip); unknown: only the per-session limit applies.
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if ((ip && !perIp(`ip:${ip}`)) || !perSession(`s:${event.sessaoId}`)) {
    return empty(429);
  }

  const { error } = await createAnonClient()
    .from("eventos")
    .insert({
      empreendimento_id: event.empreendimentoId,
      unidade_id: event.unidadeId ?? null,
      comodo_id: event.comodoId ?? null,
      sessao_id: event.sessaoId,
      tipo: event.tipo,
      dados: event.dados,
    });
  if (error) {
    // PT429: the database limit per session (privado.limitar_eventos); the
    // rest: refused by the RLS or the foreign keys (unpublished project,
    // unit of another one).
    return empty(error.code === "PT429" ? 429 : 400);
  }
  return empty(204);
}
