// Generates supabase/seed.sql from supabase/seed/residencial-demo.json.
// Command: npm run db:seed:gerar  (scripts/seed/cli.mjs). Then: npm run db:seed.
//
// The seed is REPEATABLE: fixed IDs + "on conflict do update", and demo rows
// removed from the JSON are deleted. All data is fictitious.
//
// The helpers come from the app itself (no copies): Node 22.18+ runs .ts files
// directly (type stripping), and vitest imports this module too.
import { readFileSync } from "node:fs";

import { demoStatus, unitNumber } from "../../src/lib/building.ts";
import {
  floorPlanSchema,
  polygonArea,
  roomGeometrySchema,
} from "../../src/lib/validacoes/planta.ts";

export const SEED_JSON_URL = new URL(
  "../../supabase/seed/residencial-demo.json",
  import.meta.url,
);
export const SEED_SQL_URL = new URL("../../supabase/seed.sql", import.meta.url);

/** SQL text literal with escaped quotes. */
const q = (value) =>
  value === null || value === undefined
    ? "null"
    : `'${String(value).replace(/'/g, "''")}'`;
const qJson = (obj) => `${q(JSON.stringify(obj))}::jsonb`;

export function readSeedData() {
  return JSON.parse(readFileSync(SEED_JSON_URL, "utf8"));
}

/**
 * Validates the JSON before generating anything: geometries and floor plans
 * with the app's Zod schemas, and the unit rules. Throws with every problem found.
 */
export function validateSeedData(data) {
  const problems = [];
  const keys = new Set(data.tipologias.map((t) => t.chave));

  for (const t of data.tipologias) {
    const plan = floorPlanSchema.safeParse(t.planta);
    if (!plan.success)
      problems.push(
        `${t.nome}: planta inválida (${plan.error.issues[0].message})`,
      );
    for (const room of t.comodos) {
      const geometry = roomGeometrySchema.safeParse(room.geometria);
      if (!geometry.success) {
        problems.push(
          `${t.nome} / ${room.nome}: geometria inválida (${geometry.error.issues[0].message})`,
        );
      }
    }
  }

  const rules = data.unidades;
  for (
    let position = 1;
    position <= data.empreendimento.unidades_por_andar;
    position++
  ) {
    const key = rules.tipologia_por_posicao[String(position)];
    if (!keys.has(key))
      problems.push(
        `unidades: posição ${position} sem tipologia válida (${key})`,
      );
    else if (!Number.isFinite(rules.preco_base[key]))
      problems.push(`unidades: preço base da tipologia ${key} inválido`);
  }
  if (!Number.isFinite(rules.acrescimo_por_andar))
    problems.push("unidades: acrescimo_por_andar inválido");

  if (problems.length) {
    throw new Error(`Dados do seed inválidos:\n- ${problems.join("\n- ")}`);
  }
}

/** The building's units, computed from the JSON rules. */
export function generateUnits(data) {
  const { numero_andares, unidades_por_andar } = data.empreendimento;
  const rules = data.unidades;
  const typologyByKey = Object.fromEntries(
    data.tipologias.map((t) => [t.chave, t]),
  );
  const units = [];
  for (let floor = 1; floor <= numero_andares; floor++) {
    for (let position = 1; position <= unidades_por_andar; position++) {
      const key = rules.tipologia_por_posicao[String(position)];
      const base = rules.preco_base[key];
      const price =
        Math.round(
          (base * (1 + rules.acrescimo_por_andar * (floor - 1))) / 1000,
        ) * 1000;
      units.push({
        andar: floor,
        posicao: position,
        numero: unitNumber(floor, position),
        tipologia_id: typologyByKey[key].id,
        preco: price,
        exibir_preco: !rules.andares_sob_consulta.includes(floor),
        status: demoStatus(floor, position),
      });
    }
  }
  return units;
}

export function generateSeedSql(data) {
  validateSeedData(data);

  const { corretor: c, empreendimento: e } = data;
  const units = generateUnits(data);
  const typologyIds = data.tipologias.map((t) => q(t.id)).join(", ");
  const roomIds = data.tipologias
    .flatMap((t) => t.comodos.map((r) => q(r.id)))
    .join(", ");
  const unitNumbers = units.map((u) => q(u.numero)).join(", ");

  const lines = [];
  const add = (text = "") => lines.push(text);

  add(
    "-- GERADO por scripts/seed/gerar-seed.mjs a partir de supabase/seed/residencial-demo.json.",
  );
  add("-- NÃO EDITE À MÃO: altere o JSON e rode `npm run db:seed:gerar`.");
  add(
    "-- Prédio demo FICTÍCIO. Repetível: IDs fixos + on conflict do update; o que saiu do JSON é apagado.",
  );
  add();

  add(
    "-- Corretora demo (sem senha: não faz login; existe para ser dona do prédio demo).",
  );
  add(
    "-- Colunas de token preenchidas com '' (o Auth do Supabase não lida bem com null nelas).",
  );
  add(
    "insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)",
  );
  add(
    `values ('00000000-0000-0000-0000-000000000000', ${q(c.id)}, 'authenticated', 'authenticated', ${q(c.email)}, now(), ${qJson({ provider: "email", providers: ["email"] })}, ${qJson({ nome: c.nome })}, now(), now(), '', '', '', '')`,
  );
  add(
    "on conflict (id) do update set email = excluded.email, raw_user_meta_data = excluded.raw_user_meta_data, updated_at = now();",
  );
  add();

  add("-- O gatilho do cadastro já cria o perfil; aqui completamos os dados.");
  add("insert into public.perfis (id, nome, whatsapp, creci, cor_marca)");
  add(
    `values (${q(c.id)}, ${q(c.nome)}, ${q(c.whatsapp)}, ${q(c.creci)}, ${q(c.cor_marca)})`,
  );
  add(
    "on conflict (id) do update set nome = excluded.nome, whatsapp = excluded.whatsapp, creci = excluded.creci, cor_marca = excluded.cor_marca;",
  );
  add();

  const projectColumns = [
    "id",
    "dono_id",
    "tipo",
    "nome",
    "slug",
    "descricao",
    "endereco",
    "cidade",
    "uf",
    "latitude",
    "longitude",
    "numero_andares",
    "unidades_por_andar",
    "construtora",
    "registro_incorporacao",
    "previsao_entrega",
    "informacoes_conferidas_em",
    "status",
  ];
  const projectValues = [
    q(e.id),
    q(c.id),
    q(e.tipo),
    q(e.nome),
    q(e.slug),
    q(e.descricao),
    q(e.endereco),
    q(e.cidade),
    q(e.uf),
    e.latitude,
    e.longitude,
    e.numero_andares,
    e.unidades_por_andar,
    q(e.construtora),
    q(e.registro_incorporacao),
    q(e.previsao_entrega),
    q(e.informacoes_conferidas_em),
    q(e.status),
  ];
  add("insert into public.empreendimentos (" + projectColumns.join(", ") + ")");
  add("values (" + projectValues.join(", ") + ")");
  add(
    "on conflict (id) do update set " +
      projectColumns
        .filter((col) => col !== "id")
        .map((col) => `${col} = excluded.${col}`)
        .join(", ") +
      ";",
  );
  add();

  add(
    "insert into public.tipologias (id, empreendimento_id, nome, quartos, suites, banheiros, vagas, area_privativa_m2, planta)",
  );
  add("values");
  add(
    data.tipologias
      .map(
        (t) =>
          `  (${q(t.id)}, ${q(e.id)}, ${q(t.nome)}, ${t.quartos}, ${t.suites}, ${t.banheiros}, ${t.vagas}, ${t.area_privativa_m2}, ${qJson(t.planta)})`,
      )
      .join(",\n"),
  );
  add(
    "on conflict (id) do update set nome = excluded.nome, quartos = excluded.quartos, suites = excluded.suites, banheiros = excluded.banheiros, vagas = excluded.vagas, area_privativa_m2 = excluded.area_privativa_m2, planta = excluded.planta;",
  );
  add();

  add(
    "insert into public.comodos (id, tipologia_id, nome, tipo, descricao, area_m2, geometria, ordem)",
  );
  add("values");
  add(
    data.tipologias
      .flatMap((t) =>
        t.comodos.map((room, i) => {
          const area =
            Math.round(polygonArea(room.geometria.pontos) * 100) / 100;
          return `  (${q(room.id)}, ${q(t.id)}, ${q(room.nome)}, ${q(room.tipo)}, ${q(room.descricao)}, ${area}, ${qJson(room.geometria)}, ${i + 1})`;
        }),
      )
      .join(",\n"),
  );
  add(
    "on conflict (id) do update set tipologia_id = excluded.tipologia_id, nome = excluded.nome, tipo = excluded.tipo, descricao = excluded.descricao, area_m2 = excluded.area_m2, geometria = excluded.geometria, ordem = excluded.ordem;",
  );
  add();

  add(
    "insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco, status)",
  );
  add("values");
  add(
    units
      .map(
        (u) =>
          `  (${q(e.id)}, ${q(u.tipologia_id)}, ${u.andar}, ${q(u.numero)}, ${u.posicao}, ${u.preco}, ${u.exibir_preco}, ${q(u.status)})`,
      )
      .join(",\n"),
  );
  add(
    "on conflict (empreendimento_id, numero) do update set tipologia_id = excluded.tipologia_id, andar = excluded.andar, posicao_no_andar = excluded.posicao_no_andar, preco = excluded.preco, exibir_preco = excluded.exibir_preco, status = excluded.status;",
  );
  add();

  add("-- Remove do prédio demo o que saiu do JSON (só linhas do demo).");
  add(
    `delete from public.comodos where tipologia_id in (${typologyIds}) and id not in (${roomIds});`,
  );
  add(
    `delete from public.unidades where empreendimento_id = ${q(e.id)} and numero not in (${unitNumbers});`,
  );
  add(
    `delete from public.tipologias where empreendimento_id = ${q(e.id)} and id not in (${typologyIds});`,
  );

  return lines.join("\n") + "\n";
}
