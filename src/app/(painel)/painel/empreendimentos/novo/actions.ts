"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createProjectSchema } from "@/lib/validacoes/empreendimento";

export type CreateProjectResult = {
  error: string;
  field?:
    "type" | "name" | "slug" | "city" | "state" | "floors" | "unitsPerFloor";
};

/**
 * Creates a project for the logged-in broker. dono_id ALWAYS comes from the
 * session; new projects start as "rascunho". Redirects to the edit page.
 */
export async function createProject(
  input: unknown,
): Promise<CreateProjectResult> {
  const userId = await requireUserId();

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue || issue.code === "invalid_type")
      return { error: "Confira os dados do empreendimento." };
    return {
      error: issue.message,
      field: issue.path[0] as CreateProjectResult["field"],
    };
  }

  const { type, name, slug, city, state, floors, unitsPerFloor } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empreendimentos")
    .insert({
      dono_id: userId,
      tipo: type,
      nome: name,
      slug,
      cidade: city,
      uf: state,
      numero_andares: floors,
      unidades_por_andar: unitsPerFloor,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique violation: the only unique column here is the slug.
    if (error.code === "23505") {
      return {
        field: "slug",
        error: "Esse link já está em uso. Escolha outro.",
      };
    }
    return {
      error: "Não foi possível criar agora. Tente de novo em instantes.",
    };
  }

  revalidatePath("/painel");
  redirect(`/painel/empreendimentos/${data.id}`);
}
