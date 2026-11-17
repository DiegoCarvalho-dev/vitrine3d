"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validacoes/perfil";

export type ProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Saves the logged-in broker's profile.
 * The id ALWAYS comes from the session, never from the form: extra fields sent
 * by the browser (e.g. "id") are dropped by the Zod schema, and RLS only lets
 * a user update their own row anyway.
 */
export async function updateProfile(input: unknown): Promise<ProfileResult> {
  const userId = await requireUserId();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confira os dados do perfil.",
    };
  }

  const { name, whatsapp, creci, brandColor, notifyLeadsByEmail } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis")
    .update({
      nome: name,
      whatsapp,
      creci,
      cor_marca: brandColor,
      notificar_leads_email: notifyLeadsByEmail,
    })
    .eq("id", userId)
    .select("id");

  if (error || !data?.length) {
    return {
      ok: false,
      error: "Não foi possível salvar agora. Tente de novo em instantes.",
    };
  }

  // The panel header shows the name: refresh the whole /painel layout.
  revalidatePath("/painel", "layout");
  return { ok: true };
}
