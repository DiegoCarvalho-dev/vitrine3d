import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createAnonClient } from "@/lib/supabase/anon";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { SLUG_PATTERN } from "@/lib/validacoes/empreendimento";

// Data of the public tour. ALWAYS through the anonymous client: the RLS only
// returns PUBLISHED projects (rascunho/arquivado → null → 404) and the column
// GRANTs never return `preco`, only `preco_publico`.

/** The link of the tour, from the URL (same format the DB checks). */
const slugSchema = z.string().max(80).regex(SLUG_PATTERN);

/** A unit number from the URL (unidades.numero: 1 to 10 characters). */
const unitNumberSchema = z.string().trim().min(1).max(10);

const PROJECT_COLUMNS =
  "id, dono_id, tipo, nome, slug, descricao, endereco, cidade, uf, numero_andares, unidades_por_andar, capa_url, construtora, registro_incorporacao, previsao_entrega, informacoes_conferidas_em";

export const getPublishedProject = cache(async (slug: string) => {
  if (!slugSchema.safeParse(slug).success) return null;
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

/**
 * One unit of a published project, with its typology (plan) and rooms, for
 * /e/[slug]/u/[numero] (issue #52). null → 404.
 */
export const getPublishedUnit = cache(async (slug: string, number: string) => {
  // Same limit as the DB (1 to 10 characters); "101 A" or "Loja 1" are valid.
  let decoded = number;
  try {
    decoded = decodeURIComponent(number); // the route param may keep "%20"
  } catch {
    return null; // broken escape ("%E0%A4%A")
  }
  const wanted = unitNumberSchema.safeParse(decoded);
  if (!wanted.success) return null;
  const tour = await getPublishedProject(slug);
  if (!tour) return null;
  // Exact match first; a link typed as "101a" still finds "101A".
  const unit =
    tour.units.find((u) => u.numero === wanted.data) ??
    tour.units.find(
      (u) => u.numero.toLowerCase() === wanted.data.toLowerCase(),
    );
  if (!unit) return null;
  const typology = unit.tipologia_id
    ? (tour.typologies.find((t) => t.id === unit.tipologia_id) ?? null)
    : null;
  if (!typology)
    return { ...tour, unit, typology: null, plan: null, rooms: [] };

  const supabase = createAnonClient();
  const [plan, rooms] = await Promise.all([
    supabase
      .from("tipologias")
      .select("planta")
      .eq("id", typology.id)
      .maybeSingle(),
    supabase
      .from("comodos")
      .select("id, nome, tipo, descricao, area_m2, geometria")
      .eq("tipologia_id", typology.id)
      .order("ordem"),
  ]);
  const failure = plan.error ?? rooms.error;
  if (failure)
    throw new Error(`Não foi possível carregar a unidade: ${failure.message}`);
  return {
    ...tour,
    unit,
    typology,
    plan: plan.data?.planta ?? null,
    rooms: rooms.data ?? [],
  };
});
