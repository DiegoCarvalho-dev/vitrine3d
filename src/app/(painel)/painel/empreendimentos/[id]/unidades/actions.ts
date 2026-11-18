"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { getMyProject } from "@/lib/empreendimentos/queries";
import { chunks, fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "@/lib/validacoes/empreendimento";
import {
  bulkUnitsSchema,
  planGrid,
  UNITS_CHUNK,
} from "@/lib/validacoes/unidade";

// Units of a project (issue #33). Every action: session user + Zod + the
// project must be MINE (getMyProject filters by dono_id); every query also
// filters by empreendimento_id. The RLS checks the owner again.

export type UnitsResult =
  { ok: true; message?: string } | { ok?: false; error: string };

const NOT_FOUND = { error: "Empreendimento não encontrado." } as const;

async function loadBuilding(rawProjectId: unknown) {
  await requireUserId();
  const id = projectIdSchema.safeParse(rawProjectId);
  if (!id.success) return null;
  const project = await getMyProject(id.data);
  return project ?? null;
}

function refresh(projectId: string) {
  revalidatePath("/painel");
  revalidatePath(`/painel/empreendimentos/${projectId}`);
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Creates the missing units of the floors × units-per-floor grid (101,
 * 102…). Existing units are never duplicated nor changed.
 */
export async function generateUnits(
  rawProjectId: unknown,
): Promise<UnitsResult> {
  const project = await loadBuilding(rawProjectId);
  if (!project) return NOT_FOUND;
  if (
    project.tipo !== "predio" ||
    !project.numero_andares ||
    !project.unidades_por_andar
  ) {
    return { error: "Informe andares e unidades por andar antes de gerar." };
  }

  const supabase = await createClient();
  const { data: existing, error } = await fetchAll((from, to) =>
    supabase
      .from("unidades")
      .select("id, andar, posicao_no_andar")
      .eq("empreendimento_id", project.id)
      .order("id")
      .range(from, to),
  );
  if (error) return { error: "Não foi possível gerar agora. Tente de novo." };

  const { toCreate, outside } = planGrid(
    project.numero_andares,
    project.unidades_por_andar,
    existing,
  );
  for (let i = 0; i < toCreate.length; i += UNITS_CHUNK) {
    const { error: insertError } = await supabase
      .from("unidades")
      .insert(
        toCreate
          .slice(i, i + UNITS_CHUNK)
          .map((unit) => ({ ...unit, empreendimento_id: project.id })),
      );
    // 23505: created in another tab meanwhile; generating again fills the rest.
    if (insertError)
      return {
        error: "Não foi possível gerar todas as unidades. Tente de novo.",
      };
  }
  refresh(project.id);
  const created = toCreate.length
    ? `${plural(toCreate.length, "unidade criada", "unidades criadas")}.`
    : "Todas as unidades já existiam.";
  return {
    ok: true,
    message: outside.length
      ? `${created} ${plural(outside.length, "unidade está", "unidades estão")} fora do tamanho do prédio.`
      : created,
  };
}

/**
 * After the building got smaller: deletes the units outside the grid that
 * have NO leads. Units with leads stay (the broker decides what to do).
 */
export async function removeUnitsOutsideGrid(
  rawProjectId: unknown,
): Promise<UnitsResult> {
  const project = await loadBuilding(rawProjectId);
  if (!project || project.tipo !== "predio") return NOT_FOUND;

  const supabase = await createClient();
  const { data: existing, error } = await fetchAll((from, to) =>
    supabase
      .from("unidades")
      .select("id, andar, posicao_no_andar, leads(count)")
      .eq("empreendimento_id", project.id)
      .order("id")
      .range(from, to),
  );
  if (error) return { error: "Não foi possível remover agora. Tente de novo." };

  const { outside } = planGrid(
    project.numero_andares ?? 0,
    project.unidades_por_andar ?? 0,
    existing,
  );
  const removable = outside.filter((u) => (u.leads[0]?.count ?? 0) === 0);
  const kept = outside.length - removable.length;
  for (const part of chunks(
    removable.map((u) => u.id),
    UNITS_CHUNK,
  )) {
    const { error: deleteError } = await supabase
      .from("unidades")
      .delete()
      .eq("empreendimento_id", project.id)
      .in("id", part);
    if (deleteError)
      return { error: "Não foi possível remover agora. Tente de novo." };
  }
  refresh(project.id);
  return {
    ok: true,
    message:
      `${plural(removable.length, "unidade removida", "unidades removidas")}.` +
      (kept
        ? ` ${plural(kept, "unidade tem", "unidades têm")} contatos de clientes e não foi apagada, para manter a ligação com eles. Para publicar, volte o tamanho do prédio para incluí-la.`
        : ""),
  };
}

/** Applies the same changes (typology, price, show price, status) to many units. */
export async function updateUnits(
  rawProjectId: unknown,
  input: unknown,
): Promise<UnitsResult> {
  const project = await loadBuilding(rawProjectId);
  if (!project) return NOT_FOUND;
  const parsed = bulkUnitsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error:
        issue && issue.code !== "invalid_type"
          ? issue.message
          : "Confira as unidades selecionadas.",
    };
  }
  const { unitIds, changes } = parsed.data;
  const supabase = await createClient();

  // Every unit and the typology must belong to THIS project. Chunks keep
  // each request's URL short (ids go in the query string).
  const parts = chunks(unitIds, UNITS_CHUNK);
  let found = 0;
  for (const part of parts) {
    const { count, error } = await supabase
      .from("unidades")
      .select("id", { count: "exact", head: true })
      .eq("empreendimento_id", project.id)
      .in("id", part);
    if (error) return { error: "Não foi possível salvar. Tente de novo." };
    found += count ?? 0;
  }
  if (found !== unitIds.length)
    return { error: "Alguma unidade não é deste empreendimento." };
  if (changes.typologyId) {
    const { data: typology } = await supabase
      .from("tipologias")
      .select("id")
      .eq("id", changes.typologyId)
      .eq("empreendimento_id", project.id)
      .maybeSingle();
    if (!typology) return { error: "Tipologia não encontrada." };
  }

  const patch: {
    tipologia_id?: string | null;
    preco?: number | null;
    exibir_preco?: boolean;
    status?: "disponivel" | "reservado" | "vendido";
  } = {};
  if (changes.typologyId !== undefined) patch.tipologia_id = changes.typologyId;
  if (changes.price !== undefined) patch.preco = changes.price;
  if (changes.showPrice !== undefined) patch.exibir_preco = changes.showPrice;
  if (changes.status !== undefined) patch.status = changes.status;

  for (const part of parts) {
    const { error } = await supabase
      .from("unidades")
      .update(patch)
      .eq("empreendimento_id", project.id)
      .in("id", part);
    if (error) return { error: "Não foi possível salvar. Tente de novo." };
  }
  refresh(project.id);
  return {
    ok: true,
    message: `${plural(unitIds.length, "unidade atualizada", "unidades atualizadas")}.`,
  };
}
