"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { deleteStoredImage } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";
import { parseOwnImagePath } from "@/lib/validacoes/midia";
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
    // Our schema messages are in Portuguese; type errors (null, wrong type,
    // missing field) only happen with a forged request: generic message.
    const issue = parsed.error.issues[0];
    const friendly =
      issue && issue.code !== "invalid_type" ? issue.message : null;
    return { ok: false, error: friendly ?? "Confira os dados do perfil." };
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

const COLUMN = { avatar: "avatar_url", logo: "logo_url" } as const;
const imageKindSchema = z.enum(["avatar", "logo"]);

/**
 * Saves (or removes, with null) the broker's photo or logo. The path must be
 * in the user's own "perfil" folder (also enforced by a DB CHECK). The
 * previous file is deleted from Storage.
 */
export async function setProfileImage(
  rawKind: unknown,
  rawPath: unknown,
): Promise<ProfileResult> {
  const userId = await requireUserId();
  const kind = imageKindSchema.safeParse(rawKind);
  const path = parseOwnImagePath(rawPath, userId, "perfil");
  if (!kind.success || !path.ok) {
    return { ok: false, error: "Imagem inválida. Envie de novo." };
  }
  const column = COLUMN[kind.data];

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("perfis")
    .select("avatar_url, logo_url")
    .eq("id", userId)
    .maybeSingle();
  if (readError) {
    // Without the previous value we can't clean it up: don't save blindly.
    return {
      ok: false,
      error: "Não foi possível salvar a imagem. Tente de novo.",
    };
  }
  const { data, error } = await supabase
    .from("perfis")
    .update({ [column]: path.path })
    .eq("id", userId)
    .select("id");
  if (error || !data?.length) {
    return {
      ok: false,
      error: "Não foi possível salvar a imagem. Tente de novo.",
    };
  }

  const previous = current?.[column];
  if (previous && previous !== path.path) await deleteStoredImage(previous);
  revalidatePath("/painel", "layout");
  return { ok: true };
}
