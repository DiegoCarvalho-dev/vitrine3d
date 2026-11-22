import { createRateLimiter } from "@/lib/rate-limit";
import { createAnonClient } from "@/lib/supabase/anon";
import { eventSchema } from "@/lib/validacoes/evento";

// Visit events of the public tour (issue #67). The browser posts here (fetch
// or sendBeacon); the event is validated and saved with the ANONYMOUS client,
// so the RLS still decides (published project only, room of the same
// project). Answers carry no detail: nothing to learn by probing.

const MAX_BODY = 2_000; // bytes
const perIp = createRateLimiter(120);
const perSession = createRateLimiter(60);

const empty = (status: number) => new Response(null, { status });

export async function POST(request: Request) {
  // Only from our own pages (a browser always sends Origin on POST).
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return empty(403);
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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!perIp(`ip:${ip}`) || !perSession(`s:${event.sessaoId}`)) {
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
    // P0001: the database limit (too many events); the rest: refused by the
    // RLS or the foreign keys (unpublished project, unit of another one).
    return empty(error.code === "P0001" ? 429 : 400);
  }
  return empty(204);
}
