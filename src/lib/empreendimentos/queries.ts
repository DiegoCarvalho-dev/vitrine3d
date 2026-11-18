import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { planGrid } from "@/lib/validacoes/unidade";

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
      .select(
        "id, andar, numero, posicao_no_andar, tipologia_id, preco, exibir_preco, status",
      )
      .eq("empreendimento_id", id)
      .order("andar", { ascending: false })
      .order("posicao_no_andar"),
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
    units: units.data?.length ?? 0,
    // The grid must match the building size (nothing missing, nothing left
    // over after the size was reduced) before publishing.
    unitGridComplete:
      project.tipo !== "predio" ||
      (() => {
        const plan = planGrid(
          project.numero_andares ?? 0,
          project.unidades_por_andar ?? 0,
          units.data ?? [],
        );
        return plan.toCreate.length === 0 && plan.outside.length === 0;
      })(),
  };
  return {
    project,
    facts,
    units: units.data ?? [],
    leadCount: leads.count ?? 0,
  };
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

/** A typology of one of MY projects (null for anything else: callers show 404). */
export const getMyTypology = cache(
  async (projectId: string, typologyId: string) => {
    if (!isUuid(typologyId)) return null;
    const project = await getMyProject(projectId);
    if (!project) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tipologias")
      .select("id, nome, area_privativa_m2")
      .eq("id", typologyId)
      .eq("empreendimento_id", project.id)
      .maybeSingle();
    if (error)
      throw new Error(
        `Não foi possível carregar a tipologia: ${error.message}`,
      );
    return data ? { project, typology: data } : null;
  },
);

/** Rooms of a typology (caller already checked ownership), in display order. */
export async function listRooms(typologyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comodos")
    .select("id, nome, tipo, descricao, area_m2, geometria, ordem")
    .eq("tipologia_id", typologyId)
    .order("ordem")
    .order("nome");
  if (error)
    throw new Error(`Não foi possível carregar os cômodos: ${error.message}`);
  return data;
}
export type RoomRow = Awaited<ReturnType<typeof listRooms>>[number];
