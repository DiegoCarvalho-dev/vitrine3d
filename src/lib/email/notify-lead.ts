import "server-only";

import { getEmailEnv } from "@/lib/env.server";
import { summarizeSession } from "@/lib/leads/session-summary";
import { loadSessionEvents, unitNumberOf } from "@/lib/leads/load-session";
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

  // The visit summary (without it the e-mail still goes: the lead matters).
  const session = lead.sessionId
    ? await loadSessionEvents(admin, {
        projectId: lead.projectId,
        sessionId: lead.sessionId,
        extraUnitId: lead.unitId,
      })
    : { events: [], extraUnitNumber: null, failed: false };
  if (session.failed) fail("eventos", lead.projectId);
  const sessionEvents = session.events;
  // One lookup when there is a session; otherwise just the unit's number.
  const unitNumber = lead.sessionId
    ? session.extraUnitNumber
    : await unitNumberOf(admin, lead.projectId, lead.unitId);

  const email = buildNewLeadEmail({
    brokerName: profile.nome,
    projectName: project.nome,
    unitNumber,
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
