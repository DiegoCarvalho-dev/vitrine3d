"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { getEmailEnv } from "@/lib/env.server";
import { leadStatusSchema } from "@/lib/leads/status";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Lead actions of the panel (#71): session user (requireUserId) + Zod + the
// RLS (the broker only updates or deletes leads of THEIR projects; the
// `.select()` shows how many rows it really touched).

export type LeadActionResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "Contato não encontrado.";
const idSchema = z.uuid();

export async function setLeadStatus(
  rawId: unknown,
  rawStatus: unknown,
): Promise<LeadActionResult> {
  await requireUserId();
  const status = leadStatusSchema.safeParse(rawStatus);
  const id = idSchema.safeParse(rawId);
  if (!id.success || !status.success)
    return { ok: false, error: "Confira o contato e a situação escolhida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status: status.data })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return { ok: false, error: NOT_FOUND };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

/** Deleting a lead on the client's request (LGPD). Irreversible. */
export async function deleteLead(rawId: unknown): Promise<LeadActionResult> {
  await requireUserId();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: NOT_FOUND };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id.data)
    .select("id, sessao_id, empreendimento_id");
  if (error || !data?.length) return { ok: false, error: NOT_FOUND };

  // The erasure is complete only with the visit history too (LGPD): the
  // events of that session, in that project. Nobody can delete events
  // through the API (they are immutable), so the server does it, but ONLY
  // after the RLS proved this broker owns the lead that was just deleted.
  const [{ sessao_id, empreendimento_id }] = data;
  const env = getEmailEnv();
  if (sessao_id && env) {
    const { error: eventsError } = await createAdminClient(env.secretKey)
      .from("eventos")
      .delete()
      .eq("sessao_id", sessao_id)
      .eq("empreendimento_id", empreendimento_id);
    if (eventsError)
      console.error(
        `Lead apagado, mas o histórico de visitas não – empreendimento ${empreendimento_id}`,
      );
  }
  revalidatePath("/painel", "layout");
  return { ok: true };
}
