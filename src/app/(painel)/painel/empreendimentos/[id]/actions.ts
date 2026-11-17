"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { canPublish, publishChecklist } from "@/lib/empreendimentos/publish";
import {
  getMyProject,
  getMyProjectDetails,
  isUuid,
} from "@/lib/empreendimentos/queries";
import { createClient } from "@/lib/supabase/server";
import {
  projectStatusSchema,
  updateProjectSchema,
} from "@/lib/validacoes/empreendimento";
import { MEDIA_BUCKET } from "@/lib/validacoes/midia";

// Every action: session user (requireUserId) + ownership check (getMyProject
// filters by dono_id) + Zod. The RLS checks the owner again in the database.

export type ActionResult =
  { ok: true } | { ok?: false; error: string; field?: string };

const NOT_FOUND = { error: "Empreendimento não encontrado." } as const;

function refresh(id: string) {
  revalidatePath("/painel");
  revalidatePath(`/painel/empreendimentos/${id}`);
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUserId();
  if (typeof id !== "string" || !isUuid(id)) return NOT_FOUND;
  const project = await getMyProject(id);
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
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        field: "slug",
        error: "Esse link já está em uso. Escolha outro.",
      };
    }
    return { error: "Não foi possível salvar agora. Tente de novo." };
  }
  refresh(id);
  return { ok: true };
}

export async function setProjectStatus(
  id: string,
  status: unknown,
): Promise<ActionResult> {
  await requireUserId();
  if (typeof id !== "string" || !isUuid(id)) return NOT_FOUND;
  const parsedStatus = projectStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { error: "Status inválido." };

  const details = await getMyProjectDetails(id);
  if (!details) return NOT_FOUND;

  // Checked again here: the page could be stale or the request forged.
  if (parsedStatus.data === "publicado" && !canPublish(details.facts)) {
    const missing = publishChecklist(details.facts)
      .filter((item) => !item.done)
      .map((item) => item.label.toLowerCase());
    return { error: `Para publicar, falta: ${missing.join(", ")}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("empreendimentos")
    .update({ status: parsedStatus.data })
    .eq("id", id);
  if (error)
    return { error: "Não foi possível mudar o status. Tente de novo." };

  refresh(id);
  return { ok: true };
}

/**
 * Deletes a project WITHOUT leads (the database refuses otherwise: policy
 * "dono apaga os sem leads"). The broker must type the project name.
 * Typologies, units and media rows go in cascade; the image files are
 * removed from Storage right after.
 */
export async function deleteProject(
  id: string,
  confirmation: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (typeof id !== "string" || !isUuid(id)) return NOT_FOUND;
  const details = await getMyProjectDetails(id);
  if (!details) return NOT_FOUND;

  if (
    typeof confirmation !== "string" ||
    confirmation.trim() !== details.project.nome.trim()
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
    .eq("id", id)
    .select("id");
  if (error) return { error: "Não foi possível excluir agora. Tente de novo." };
  if (!data.length) {
    // A lead arrived between the check and the delete: the DB kept it.
    return {
      error:
        "Chegou um contato de cliente neste empreendimento. Ele não pode mais ser excluído; arquive.",
    };
  }

  // Best effort: an orphan image never blocks the deletion.
  const folder = `${userId}/${id}`;
  const { data: files } = await supabase.storage
    .from(MEDIA_BUCKET)
    .list(folder, { limit: 1000 });
  if (files?.length) {
    const { error: removeError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove(files.map((file) => `${folder}/${file.name}`));
    if (removeError)
      console.warn(
        `[storage] Imagens órfãs em ${folder}: ${removeError.message}`,
      );
  }

  revalidatePath("/painel");
  redirect("/painel?excluido=1");
}
