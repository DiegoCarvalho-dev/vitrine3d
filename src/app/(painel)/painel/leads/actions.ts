"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { leadStatusSchema } from "@/lib/leads/status";
import { createClient } from "@/lib/supabase/server";

// Lead actions of the panel (#71): session user (requireUserId) + Zod + the
// RLS (the broker only updates or deletes leads of THEIR projects; the
// `.select()` shows how many rows it really touched).

export type LeadActionResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND = "Contato não encontrado.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setLeadStatus(
  rawId: unknown,
  rawStatus: unknown,
): Promise<LeadActionResult> {
  await requireUserId();
  const status = leadStatusSchema.safeParse(rawStatus);
  if (typeof rawId !== "string" || !UUID.test(rawId) || !status.success)
    return { ok: false, error: "Confira o contato e a situação escolhida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status: status.data })
    .eq("id", rawId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: NOT_FOUND };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

/** Deleting a lead on the client's request (LGPD). Irreversible. */
export async function deleteLead(rawId: unknown): Promise<LeadActionResult> {
  await requireUserId();
  if (typeof rawId !== "string" || !UUID.test(rawId))
    return { ok: false, error: NOT_FOUND };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", rawId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: NOT_FOUND };
  revalidatePath("/painel", "layout");
  return { ok: true };
}
