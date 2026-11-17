"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { canPublish, publishChecklist } from "@/lib/empreendimentos/publish";
import {
  getMyProject,
  getMyProjectDetails,
} from "@/lib/empreendimentos/queries";
import { deleteStoredImage } from "@/lib/storage/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteConfirmationSchema,
  projectIdSchema,
  projectStatusSchema,
  updateProjectSchema,
} from "@/lib/validacoes/empreendimento";
import { MEDIA_BUCKET, parseOwnImagePath } from "@/lib/validacoes/midia";

// Every action: session user (requireUserId) + Zod + ownership check
// (getMyProject filters by dono_id). The RLS checks the owner again.

export type ActionResult =
  { ok: true } | { ok?: false; error: string; field?: string };

const NOT_FOUND = { error: "Empreendimento não encontrado." } as const;
const LEADS_ARRIVED =
  "Chegou um contato de cliente neste empreendimento. Ele não pode mais ser excluído; arquive.";

function refresh(id: string) {
  revalidatePath("/painel");
  revalidatePath(`/painel/empreendimentos/${id}`);
}

export async function updateProject(
  rawId: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireUserId();
  const id = projectIdSchema.safeParse(rawId);
  if (!id.success) return NOT_FOUND;
  const project = await getMyProject(id.data);
  if (!project) return NOT_FOUND;

  // The type (building/house) can't change here: it comes from the database.
  const parsed = updateProjectSchema.safeParse(
    typeof input === "object" && input !== null
      ? { ...input, type: project.tipo }
      : input,
  );
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue || issue.code === "invalid_type")
      return { error: "Confira os dados do empreendimento." };
    return { error: issue.message, field: String(issue.path[0]) };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("empreendimentos")
    .update({
      nome: data.name,
      slug: data.slug,
      descricao: data.description,
      endereco: data.address,
      cidade: data.city,
      uf: data.state,
      numero_andares: data.floors,
      unidades_por_andar: data.unitsPerFloor,
      construtora: data.builder,
      registro_incorporacao: data.incorporationRegistry,
      previsao_entrega: data.deliveryForecast,
      informacoes_conferidas_em: data.checkedAt,
    })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") {
      return {
        field: "slug",
        error: "Esse link já está em uso. Escolha outro.",
      };
    }
    return { error: "Não foi possível salvar agora. Tente de novo." };
  }
  refresh(id.data);
  return { ok: true };
}

export async function setProjectStatus(
  rawId: unknown,
  rawStatus: unknown,
): Promise<ActionResult> {
  await requireUserId();
  const id = projectIdSchema.safeParse(rawId);
  if (!id.success) return NOT_FOUND;
  const status = projectStatusSchema.safeParse(rawStatus);
  if (!status.success) return { error: "Status inválido." };

  if (status.data === "publicado") {
    // Checked again here: the page could be stale or the request forged.
    const details = await getMyProjectDetails(id.data);
    if (!details) return NOT_FOUND;
    if (!canPublish(details.facts)) {
      const missing = publishChecklist(details.facts)
        .filter((item) => !item.done)
        .map((item) => item.label.toLowerCase());
      return { error: `Para publicar, falta: ${missing.join(", ")}.` };
    }
  } else if (!(await getMyProject(id.data))) {
    return NOT_FOUND; // archive / back to draft only need ownership
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("empreendimentos")
    .update({ status: status.data })
    .eq("id", id.data);
  if (error)
    return { error: "Não foi possível mudar o status. Tente de novo." };

  refresh(id.data);
  return { ok: true };
}

/** Removes every image in the project's Storage folder (best effort). */
async function removeProjectImages(folder: string) {
  const supabase = await createClient();
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  const PAGE = 1000;
  for (;;) {
    // Always page 0: each round deletes what it listed.
    const { data: files, error } = await bucket.list(folder, { limit: PAGE });
    if (error) {
      console.warn(`[storage] Não listei ${folder}: ${error.message}`);
      return;
    }
    if (!files.length) return;
    const { data: removed, error: removeError } = await bucket.remove(
      files.map((file) => `${folder}/${file.name}`),
    );
    // Nothing removed (e.g. refused silently by a policy): stop, or the next
    // list() would return the same files forever.
    if (removeError || !removed?.length) {
      console.warn(
        `[storage] Imagens órfãs em ${folder}: ${removeError?.message ?? "nada apagado"}`,
      );
      return;
    }
    if (files.length < PAGE) return;
  }
}

/**
 * Deletes a project WITHOUT leads (the database refuses otherwise: DELETE
 * policy + trigger). The broker must type the project name. Typologies,
 * units and media rows go in cascade; the image files are removed from
 * Storage right after.
 */
export async function deleteProject(
  rawId: unknown,
  rawConfirmation: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const id = projectIdSchema.safeParse(rawId);
  if (!id.success) return NOT_FOUND;
  const details = await getMyProjectDetails(id.data);
  if (!details) return NOT_FOUND;

  const confirmation = deleteConfirmationSchema.safeParse(rawConfirmation);
  if (
    !confirmation.success ||
    confirmation.data.trim() !== details.project.nome.trim()
  ) {
    return {
      field: "confirmation",
      error: "Digite o nome exatamente como aparece para confirmar.",
    };
  }
  if (details.leadCount > 0) {
    return {
      error:
        "Este empreendimento tem contatos de clientes e não pode ser excluído. Arquive para tirá-lo do ar.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .delete()
    .eq("id", id.data)
    .select("id");
  // P0001 = the trigger saw a lead that arrived during the deletion.
  if (error?.code === "P0001") return { error: LEADS_ARRIVED };
  if (error) return { error: "Não foi possível excluir agora. Tente de novo." };
  if (!data.length) return { error: LEADS_ARRIVED }; // the policy kept it

  await removeProjectImages(`${userId}/${id.data}`);

  revalidatePath("/painel");
  redirect("/painel?excluido=1");
}

/**
 * Saves (or removes, with null) the project cover. The path must be inside
 * THIS project's folder of the logged-in broker (a forged path pointing at
 * someone else's file is refused here and by the DB CHECK). The previous
 * file is deleted from Storage, so replacing leaves no orphan.
 */
export async function setProjectCover(
  rawId: unknown,
  rawPath: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const id = projectIdSchema.safeParse(rawId);
  if (!id.success) return NOT_FOUND;
  const project = await getMyProject(id.data);
  if (!project) return NOT_FOUND;

  const path = parseOwnImagePath(rawPath, userId, id.data);
  if (!path.ok) return { error: "Imagem inválida. Envie de novo." };
  // The cover is required to publish: a live tour can't lose it.
  if (path.path === null && project.status === "publicado") {
    return {
      error:
        "A capa é obrigatória com o empreendimento publicado. Troque a foto ou volte para rascunho antes de remover.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .update({ capa_url: path.path })
    .eq("id", id.data)
    .select("id");
  // Only delete the old file when the new value was really saved.
  if (error || !data.length)
    return { error: "Não foi possível salvar a capa. Tente de novo." };

  if (project.capa_url && project.capa_url !== path.path) {
    await deleteStoredImage(project.capa_url);
  }
  refresh(id.data);
  return { ok: true };
}
