import "server-only";

import { getEmailEnv } from "@/lib/env.server";
import {
  type SessionEvent,
  summarizeSession,
} from "@/lib/leads/session-summary";
import { siteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";

import { buildNewLeadEmail } from "./new-lead";

// Sends the new-lead e-mail (issue #70). Runs on the server AFTER the answer
// to the visitor (next/server `after`): a slow or failed e-mail never loses
// the lead (it's already saved and shows in the panel). Logs carry no
// personal data.

export type LeadForEmail = {
  projectId: string;
  unitId: string | null;
  sessionId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  origin: string | null;
};

/** Logs WHAT failed (never personal data or keys). */
function fail(step: string, projectId: string) {
  console.error(
    `E-mail de novo lead: falha ao ler ${step} – empreendimento ${projectId}`,
  );
}

export async function notifyBrokerOfLead(lead: LeadForEmail): Promise<void> {
  const env = getEmailEnv();
  if (!env) return; // keys not configured: e-mail off
  const admin = createAdminClient(env.secretKey);

  // Only a PUBLISHED project's owner is notified (the lead could only be
  // saved for one anyway).
  const { data: project, error: projectError } = await admin
    .from("empreendimentos")
    .select("nome, dono_id, status")
    .eq("id", lead.projectId)
    .maybeSingle();
  if (projectError) return fail("empreendimento", lead.projectId);
  if (!project || project.status !== "publicado") return;

  const { data: profile, error: profileError } = await admin
    .from("perfis")
    .select("nome, notificar_leads_email")
    .eq("id", project.dono_id)
    .maybeSingle();
  if (profileError) return fail("perfil", lead.projectId);
  if (!profile?.notificar_leads_email) return; // turned off in the profile

  const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(
    project.dono_id,
  );
  if (ownerError) return fail("e-mail do corretor", lead.projectId);
  const to = owner.user?.email;
  if (!to) return;

  // Plain queries (no embedded joins): the unit and room names are looked up
  // by id, only those of this project.
  const { data: events, error: eventsError } = lead.sessionId
    ? await admin
        .from("eventos")
        .select("tipo, criado_em, dados, unidade_id, comodo_id")
        .eq("empreendimento_id", lead.projectId)
        .eq("sessao_id", lead.sessionId)
        // The LATEST 500 (what was seen right before the form matters most).
        .order("criado_em", { ascending: false })
        .limit(500)
    : { data: [], error: null };
  // Without the summary the e-mail still goes (the lead is what matters).
  if (eventsError) fail("eventos", lead.projectId);
  const unitIds = [
    ...new Set(
      [lead.unitId, ...(events ?? []).map((e) => e.unidade_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const roomIds = [
    ...new Set(
      (events ?? [])
        .map((e) => e.comodo_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [units, rooms] = await Promise.all([
    unitIds.length
      ? admin
          .from("unidades")
          .select("id, numero")
          .eq("empreendimento_id", lead.projectId)
          .in("id", unitIds)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? admin.from("comodos").select("id, nome").in("id", roomIds)
      : Promise.resolve({ data: [] }),
  ]);
  const unitNumber = new Map((units.data ?? []).map((u) => [u.id, u.numero]));
  const roomName = new Map((rooms.data ?? []).map((r) => [r.id, r.nome]));

  const sessionEvents: SessionEvent[] = (events ?? []).map((event) => {
    const dados = event.dados as { segundos?: unknown } | null;
    // Events can be inserted straight through the public key: only a sane
    // number of seconds counts (same bounds as the site's validation).
    const seconds = dados?.segundos;
    return {
      tipo: event.tipo,
      criado_em: event.criado_em,
      unidade: event.unidade_id
        ? (unitNumber.get(event.unidade_id) ?? null)
        : null,
      comodo: event.comodo_id ? (roomName.get(event.comodo_id) ?? null) : null,
      segundos:
        Number.isInteger(seconds) &&
        (seconds as number) >= 0 &&
        (seconds as number) <= 86_400
          ? (seconds as number)
          : null,
    };
  });

  const email = buildNewLeadEmail({
    brokerName: profile.nome,
    projectName: project.nome,
    unitNumber: lead.unitId ? (unitNumber.get(lead.unitId) ?? null) : null,
    lead: {
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      message: lead.message,
      origin: lead.origin,
    },
    summary: sessionEvents.length ? summarizeSession(sessionEvents) : null,
    panelUrl: `${siteUrl()}/painel`,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: [to],
      // "Reply" in the e-mail app goes straight to the visitor.
      ...(lead.email ? { reply_to: lead.email } : {}),
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
    // Resend hanging never keeps the server busy for long.
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Status only: the body could echo addresses.
    console.error(
      `E-mail de novo lead não enviado (Resend ${response.status}) – empreendimento ${lead.projectId}`,
    );
  }
}
