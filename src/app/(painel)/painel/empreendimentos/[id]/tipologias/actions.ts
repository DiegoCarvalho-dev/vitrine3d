"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { getMyProject } from "@/lib/empreendimentos/queries";
import { createClient } from "@/lib/supabase/server";
import { projectIdSchema } from "@/lib/validacoes/empreendimento";
import { copyName, typologySchema } from "@/lib/validacoes/tipologia";

// Typologies of a project. Every action: session user + Zod + the project
// must be MINE (getMyProject filters by dono_id) + the typology must belong to
// that project. The RLS checks the owner again in the database.

export type TypologyResult =
  { ok: true; id?: string } | { ok?: false; error: string; field?: string };

const NOT_FOUND = { error: "Tipologia não encontrada." } as const;
const typologyIdSchema = projectIdSchema; // same strict UUID check

function refresh(projectId: string) {
  revalidatePath(`/painel/empreendimentos/${projectId}`, "layout");
}

function toRow(data: z.output<typeof typologySchema>) {
  return {
    nome: data.name,
    quartos: data.bedrooms,
    suites: data.suites,
    banheiros: data.bathrooms,
    vagas: data.parkingSpots,
    area_privativa_m2: data.privateArea,
  };
}

function parseOrError(
  input: unknown,
):
  | { ok: true; data: z.output<typeof typologySchema> }
  | { ok: false; result: TypologyResult } {
  const parsed = typologySchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  if (!issue || issue.code === "invalid_type")
    return { ok: false, result: { error: "Confira os dados da tipologia." } };
  return {
    ok: false,
    result: { error: issue.message, field: String(issue.path[0]) },
  };
}

const DUPLICATE_NAME = {
  field: "name",
  error: "Já existe uma tipologia com esse nome neste empreendimento.",
};

/** The project (mine) and, when given, a typology of THAT project. */
async function load(rawProjectId: unknown, rawTypologyId?: unknown) {
  await requireUserId();
  const projectId = projectIdSchema.safeParse(rawProjectId);
  if (!projectId.success) return null;
  const project = await getMyProject(projectId.data);
  if (!project) return null;
  if (rawTypologyId === undefined) return { project, typology: null };

  const typologyId = typologyIdSchema.safeParse(rawTypologyId);
  if (!typologyId.success) return null;
  const supabase = await createClient();
  const { data: typology } = await supabase
    .from("tipologias")
    .select("id, nome")
    .eq("id", typologyId.data)
    .eq("empreendimento_id", project.id)
    .maybeSingle();
  return typology ? { project, typology } : null;
}

export async function createTypology(
  rawProjectId: unknown,
  input: unknown,
): Promise<TypologyResult> {
  const loaded = await load(rawProjectId);
  if (!loaded) return { error: "Empreendimento não encontrado." };
  const parsed = parseOrError(input);
  if (!parsed.ok) return parsed.result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipologias")
    .insert({ empreendimento_id: loaded.project.id, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error?.code === "23505") return DUPLICATE_NAME;
  if (error)
    return { error: "Não foi possível criar a tipologia. Tente de novo." };
  refresh(loaded.project.id);
  return { ok: true, id: data.id };
}

export async function updateTypology(
  rawProjectId: unknown,
  rawTypologyId: unknown,
  input: unknown,
): Promise<TypologyResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  if (!loaded?.typology) return NOT_FOUND;
  const parsed = parseOrError(input);
  if (!parsed.ok) return parsed.result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipologias")
    .update(toRow(parsed.data))
    .eq("id", loaded.typology.id)
    .select("id");
  if (error?.code === "23505") return DUPLICATE_NAME;
  if (error || !data.length)
    return { error: "Não foi possível salvar a tipologia. Tente de novo." };
  refresh(loaded.project.id);
  return { ok: true };
}

/** Copies a typology and its rooms ("Tipo A (cópia)"). */
export async function duplicateTypology(
  rawProjectId: unknown,
  rawTypologyId: unknown,
): Promise<TypologyResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  if (!loaded?.typology) return NOT_FOUND;
  const supabase = await createClient();

  const [source, names, rooms] = await Promise.all([
    supabase
      .from("tipologias")
      .select("quartos, suites, banheiros, vagas, area_privativa_m2, planta")
      .eq("id", loaded.typology.id)
      .single(),
    supabase
      .from("tipologias")
      .select("nome")
      .eq("empreendimento_id", loaded.project.id),
    supabase
      .from("comodos")
      .select("nome, tipo, descricao, area_m2, geometria, ordem")
      .eq("tipologia_id", loaded.typology.id),
  ]);
  if (source.error || names.error || rooms.error)
    return { error: "Não foi possível duplicar agora. Tente de novo." };

  const { data: copy, error } = await supabase
    .from("tipologias")
    .insert({
      empreendimento_id: loaded.project.id,
      nome: copyName(
        loaded.typology.nome,
        names.data.map((t) => t.nome),
      ),
      ...source.data,
    })
    .select("id")
    .single();
  if (error)
    return { error: "Não foi possível duplicar agora. Tente de novo." };

  if (rooms.data.length) {
    const { error: roomsError } = await supabase
      .from("comodos")
      .insert(rooms.data.map((room) => ({ ...room, tipologia_id: copy.id })));
    if (roomsError) {
      // Don't leave a half copy behind.
      await supabase.from("tipologias").delete().eq("id", copy.id);
      return { error: "Não foi possível copiar os cômodos. Tente de novo." };
    }
  }
  refresh(loaded.project.id);
  return { ok: true, id: copy.id };
}

/** Deletes a typology. Its rooms go with it; units stay, without typology. */
export async function deleteTypology(
  rawProjectId: unknown,
  rawTypologyId: unknown,
): Promise<TypologyResult> {
  const loaded = await load(rawProjectId, rawTypologyId);
  if (!loaded?.typology) return NOT_FOUND;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tipologias")
    .delete()
    .eq("id", loaded.typology.id)
    .select("id");
  if (error || !data.length)
    return { error: "Não foi possível excluir a tipologia. Tente de novo." };
  refresh(loaded.project.id);
  return { ok: true };
}
