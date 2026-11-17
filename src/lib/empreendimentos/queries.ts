import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Panel queries. ALWAYS filter by the owner: for a logged-in broker the RLS
// also returns OTHER brokers' published projects (that's what the public tour
// needs), so the panel must not rely on RLS alone to show "my" projects.

export async function listMyProjects() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .select(
      "id, tipo, nome, slug, cidade, uf, status, atualizado_em, unidades(count)",
    )
    .eq("dono_id", userId)
    .order("atualizado_em", { ascending: false });
  if (error)
    throw new Error(
      `Não foi possível carregar os empreendimentos: ${error.message}`,
    );
  return data.map(({ unidades, ...project }) => ({
    ...project,
    unitCount: unidades[0]?.count ?? 0,
  }));
}
export type MyProjectListItem = Awaited<
  ReturnType<typeof listMyProjects>
>[number];

/** One of MY projects, or null (also for other brokers' ids: callers show 404). */
export const getMyProject = cache(async (id: string) => {
  const userId = await requireUserId();
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .select("*")
    .eq("id", id)
    .eq("dono_id", userId)
    .maybeSingle();
  if (error)
    throw new Error(
      `Não foi possível carregar o empreendimento: ${error.message}`,
    );
  return data;
});
