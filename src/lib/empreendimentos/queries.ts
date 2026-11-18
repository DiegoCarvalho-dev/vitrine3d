import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type { PublishFacts } from "./publish";

/** Strict UUID check: anything else is "not found", never a DB error. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// Panel queries. ALWAYS filter by the owner: for a logged-in broker the RLS
// also returns OTHER brokers' published projects (that's what the public tour
// needs), so the panel must not rely on RLS alone to show "my" projects.

export async function listMyProjects() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .select(
      "id, tipo, nome, slug, cidade, uf, status, capa_url, atualizado_em, unidades(count)",
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
  if (!isUuid(id)) return null;
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

/**
 * One of MY projects plus what the edit page needs: the publish checklist
 * facts and how many leads it has (with leads it can only be archived).
 */
export const getMyProjectDetails = cache(async (id: string) => {
  const project = await getMyProject(id);
  if (!project) return null;
  const supabase = await createClient();
  const [typologies, units, leads] = await Promise.all([
    supabase
      .from("tipologias")
      .select("id, comodos(count)")
      .eq("empreendimento_id", id),
    supabase
      .from("unidades")
      .select("id", { count: "exact", head: true })
      .eq("empreendimento_id", id),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("empreendimento_id", id),
  ]);
  const error = typologies.error ?? units.error ?? leads.error;
  if (error)
    throw new Error(
      `Não foi possível carregar o empreendimento: ${error.message}`,
    );

  const facts: PublishFacts = {
    isBuilding: project.tipo === "predio",
    hasCover: Boolean(project.capa_url),
    typologiesWithRooms: (typologies.data ?? []).filter(
      (t) => (t.comodos[0]?.count ?? 0) > 0,
    ).length,
    units: units.count ?? 0,
  };
  return { project, facts, leadCount: leads.count ?? 0 };
});

/** Typologies of one of MY projects, with how many rooms and units use each. */
export async function listMyTypologies(projectId: string) {
  const project = await getMyProject(projectId);
  if (!project) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipologias")
    .select(
      "id, nome, quartos, suites, banheiros, vagas, area_privativa_m2, comodos(count), unidades(count)",
    )
    .eq("empreendimento_id", projectId)
    .order("nome");
  if (error)
    throw new Error(
      `Não foi possível carregar as tipologias: ${error.message}`,
    );
  return data.map(({ comodos, unidades, ...typology }) => ({
    ...typology,
    roomCount: comodos[0]?.count ?? 0,
    unitCount: unidades[0]?.count ?? 0,
  }));
}
export type MyTypology = Awaited<ReturnType<typeof listMyTypologies>>[number];
