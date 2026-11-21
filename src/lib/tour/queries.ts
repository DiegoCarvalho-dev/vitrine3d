import "server-only";

import { cache } from "react";

import { createAnonClient } from "@/lib/supabase/anon";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { SLUG_PATTERN } from "@/lib/validacoes/empreendimento";

// Data of the public tour. ALWAYS through the anonymous client: the RLS only
// returns PUBLISHED projects (rascunho/arquivado → null → 404) and the column
// GRANTs never return `preco`, only `preco_publico`.

const PROJECT_COLUMNS =
  "id, dono_id, tipo, nome, slug, descricao, endereco, cidade, uf, numero_andares, unidades_por_andar, capa_url, construtora, registro_incorporacao, previsao_entrega, informacoes_conferidas_em";

export const getPublishedProject = cache(async (slug: string) => {
  if (!SLUG_PATTERN.test(slug) || slug.length > 80) return null;
  const supabase = createAnonClient();
  const { data: project, error } = await supabase
    .from("empreendimentos")
    .select(PROJECT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error)
    throw new Error(`Não foi possível carregar o tour: ${error.message}`);
  if (!project) return null;

  const [broker, typologies, units] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, whatsapp, creci, avatar_url, logo_url, cor_marca")
      .eq("id", project.dono_id)
      .maybeSingle(),
    supabase
      .from("tipologias")
      .select("id, nome, quartos, suites, banheiros, vagas, area_privativa_m2")
      .eq("empreendimento_id", project.id)
      .order("nome"),
    fetchAll((from, to) =>
      supabase
        .from("unidades")
        .select(
          "id, andar, numero, posicao_no_andar, tipologia_id, preco_publico, exibir_preco, status",
        )
        .eq("empreendimento_id", project.id)
        .order("andar", { ascending: false })
        .order("posicao_no_andar")
        .range(from, to),
    ),
  ]);
  const failure = broker.error ?? typologies.error ?? units.error;
  if (failure)
    throw new Error(`Não foi possível carregar o tour: ${failure.message}`);

  return {
    project,
    broker: broker.data,
    typologies: typologies.data ?? [],
    units: units.data,
  };
});

export type TourData = NonNullable<
  Awaited<ReturnType<typeof getPublishedProject>>
>;
