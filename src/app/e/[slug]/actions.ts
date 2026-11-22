"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { notifyBrokerOfLead } from "@/lib/email/notify-lead";

import { createRateLimiter } from "@/lib/rate-limit";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  leadContextSchema,
  leadSchema,
  MIN_FILL_MS,
} from "@/lib/validacoes/lead";

// Interest form of the public tour (issue #69). Saved with the ANONYMOUS
// client: the RLS only accepts it with consent, for a published project, and
// the visitor can never read leads back (not even this one).

export type LeadResult = { ok: true } | { ok: false; error: string };

const TOO_MANY =
  "Muitos envios em pouco tempo. Tente de novo em alguns minutos.";
// Generous per IP: phone carriers (CGNAT) and launch events share one IP.
const perIp = createRateLimiter(30, 10 * 60_000);
const perSession = createRateLimiter(5, 10 * 60_000);

export async function sendLead(
  input: unknown,
  context: unknown,
): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    // Our messages are in Portuguese; type errors only come from a forged
    // request: generic message.
    const issue = parsed.error.issues[0];
    const friendly =
      issue && issue.code !== "invalid_type" ? issue.message : null;
    return { ok: false, error: friendly ?? "Confira os dados do formulário." };
  }
  const meta = leadContextSchema.safeParse(context);
  if (!meta.success) {
    return { ok: false, error: "Confira os dados do formulário." };
  }
  const lead = parsed.data;
  const { projectId, origin, sessionId, fillMs } = meta.data;

  // A bot (filled the hidden field or sent too fast): pretend it worked, so
  // it learns nothing; nothing is saved.
  if (lead.website || fillMs < MIN_FILL_MS) return { ok: true };

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (
    (ip && !perIp(`ip:${ip}:${projectId}`)) ||
    (sessionId && !perSession(`s:${sessionId}`))
  ) {
    return { ok: false, error: TOO_MANY };
  }

  const supabase = createAnonClient();
  // No .select(): the visitor has no permission to read the lead back.
  const { error } = await supabase.from("leads").insert({
    empreendimento_id: projectId,
    unidade_id: lead.unitId,
    nome: lead.name,
    telefone: lead.phone,
    email: lead.email,
    mensagem: lead.message,
    origem: origin,
    consentimento_lgpd: true,
    sessao_id: sessionId,
  });
  if (error) {
    // PT429: the database limit; the rest (unpublished project, unit of
    // another project, sizes): generic, nothing to learn by probing.
    return {
      ok: false,
      error:
        error.code === "PT429"
          ? TOO_MANY
          : "Não foi possível enviar agora. Tente de novo em instantes.",
    };
  }

  // E-mail to the broker AFTER answering the visitor (issue #70): a slow or
  // failed e-mail never delays or loses the lead.
  after(async () => {
    try {
      await notifyBrokerOfLead({
        projectId,
        unitId: lead.unitId,
        sessionId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        message: lead.message,
        origin,
      });
    } catch {
      console.error(
        `Falha no e-mail de novo lead – empreendimento ${projectId}`,
      );
    }
  });

  // The visit event (best effort: the lead is what matters).
  if (sessionId) {
    await supabase.from("eventos").insert({
      empreendimento_id: projectId,
      unidade_id: lead.unitId,
      sessao_id: sessionId,
      tipo: "enviou_lead",
    });
  }
  return { ok: true };
}
