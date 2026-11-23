import { allowByIp, clientIp, getWriter } from "@/lib/public-writes";
import { eventSchema } from "@/lib/validacoes/evento";

// Visit events of the public tour (issues #67 and #84). The browser posts
// here (fetch or sendBeacon); the event is validated (Zod) and saved by the
// SERVER (the visitor's public key can't insert). The database still refuses
// an unpublished project or a room of another project (trigger), and limits
// each session (60 events per minute). Answers carry no detail: nothing to
// learn by probing.

const MAX_BODY = 2_000; // characters of JSON (an event is ~300)
const PER_IP_PER_MINUTE = 120;

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

  // Without the server key the tour still works; the event is just lost.
  const writer = getWriter();
  if (!writer) return empty(503);

  const allowed = await allowByIp(writer, {
    ip: clientIp(request.headers),
    scope: "evento",
    limit: PER_IP_PER_MINUTE,
    windowSeconds: 60,
  });
  if (!allowed) return empty(429);

  const { error } = await writer.client.from("eventos").insert({
    empreendimento_id: event.empreendimentoId,
    unidade_id: event.unidadeId ?? null,
    comodo_id: event.comodoId ?? null,
    sessao_id: event.sessaoId,
    tipo: event.tipo,
    dados: event.dados,
  });
  if (error) {
    // PT429: the per-session limit; the rest (unpublished project, room or
    // unit of another project, bad data): refused, without detail.
    return empty(error.code === "PT429" ? 429 : 400);
  }
  return empty(204);
}
