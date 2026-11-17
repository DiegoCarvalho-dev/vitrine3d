import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// Who is logged in, for Server Components and Server Actions.
// React cache(): layout and page share ONE check per request (no duplicate
// round-trips). Every panel page calls requireUserId()/getCurrentProfile():
// the proxy redirect is only the first line of defense.

/** Verified user id (getClaims checks the JWT; never getSession). */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

/** Logged-in user id, or redirect to /entrar. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  return userId;
}

/** Profile of the logged-in user (redirects to /entrar when logged out). */
export const getCurrentProfile = cache(async () => {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis")
    .select(
      "id, nome, whatsapp, creci, cor_marca, notificar_leads_email, avatar_url, logo_url",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error)
    throw new Error(`Não foi possível carregar o perfil: ${error.message}`);
  return data;
});
