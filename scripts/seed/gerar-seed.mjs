// Gera supabase/seed.sql a partir de supabase/seed/residencial-demo.json.
// Uso: npm run db:seed:gerar      (depois: npm run db:seed para aplicar no dev)
//
// O seed é REPETÍVEL: IDs fixos + "on conflict do update". Rodar duas vezes não
// duplica nada. Todos os dados são fictícios.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../../", import.meta.url);
const ARQUIVO_JSON = new URL("supabase/seed/residencial-demo.json", RAIZ);
const ARQUIVO_SQL = new URL("supabase/seed.sql", RAIZ);

/** Texto SQL com aspas escapadas. */
const q = (valor) =>
  valor === null || valor === undefined
    ? "null"
    : `'${String(valor).replace(/'/g, "''")}'`;
const qJson = (obj) => `${q(JSON.stringify(obj))}::jsonb`;

/** Área de um polígono (fórmula do cadarço), igual a areaDoPoligono em src/lib/validacoes/planta.ts. */
export function areaDoPoligono(pontos) {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    soma += x1 * y2 - x2 * y1;
  }
  return Math.abs(soma) / 2;
}

/** Mesma fórmula de demoStatus em src/lib/building.ts (o 3D de exemplo e o banco batem). */
export function statusDaUnidade(andar, posicao) {
  if (andar === 9 && posicao === 3) return "disponivel";
  const n = (andar * 7 + posicao * 3) % 10;
  if (n < 4) return "disponivel";
  if (n < 7) return "reservado";
  return "vendido";
}

/** As unidades do prédio, calculadas pelas regras do JSON. */
export function gerarUnidades(dados) {
  const { numero_andares, unidades_por_andar } = dados.empreendimento;
  const regras = dados.unidades;
  const tipologiaPorChave = Object.fromEntries(
    dados.tipologias.map((t) => [t.chave, t]),
  );
  const unidades = [];
  for (let andar = 1; andar <= numero_andares; andar++) {
    for (let posicao = 1; posicao <= unidades_por_andar; posicao++) {
      const chave = regras.tipologia_por_posicao[String(posicao)];
      const base = regras.preco_base[chave];
      const preco =
        Math.round(
          (base * (1 + regras.acrescimo_por_andar * (andar - 1))) / 1000,
        ) * 1000;
      unidades.push({
        andar,
        posicao,
        numero: `${andar}${String(posicao).padStart(2, "0")}`,
        tipologia_id: tipologiaPorChave[chave].id,
        preco,
        exibir_preco: !regras.andares_sob_consulta.includes(andar),
        status: statusDaUnidade(andar, posicao),
      });
    }
  }
  return unidades;
}

export function gerarSeedSql(dados) {
  const { corretor: c, empreendimento: e } = dados;
  const linhas = [];
  const add = (texto = "") => linhas.push(texto);

  add(
    "-- GERADO por scripts/seed/gerar-seed.mjs a partir de supabase/seed/residencial-demo.json.",
  );
  add("-- NÃO EDITE À MÃO: altere o JSON e rode `npm run db:seed:gerar`.");
  add("-- Prédio demo FICTÍCIO. Repetível: IDs fixos + on conflict do update.");
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
  add("on conflict (id) do nothing;");
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

  const colunasEmp = [
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
  const valoresEmp = [
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
  add("insert into public.empreendimentos (" + colunasEmp.join(", ") + ")");
  add("values (" + valoresEmp.join(", ") + ")");
  add(
    "on conflict (id) do update set " +
      colunasEmp
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
    dados.tipologias
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
    dados.tipologias
      .flatMap((t) =>
        t.comodos.map((cm, i) => {
          const area =
            Math.round(areaDoPoligono(cm.geometria.pontos) * 100) / 100;
          return `  (${q(cm.id)}, ${q(t.id)}, ${q(cm.nome)}, ${q(cm.tipo)}, ${q(cm.descricao)}, ${area}, ${qJson(cm.geometria)}, ${i + 1})`;
        }),
      )
      .join(",\n"),
  );
  add(
    "on conflict (id) do update set nome = excluded.nome, tipo = excluded.tipo, descricao = excluded.descricao, area_m2 = excluded.area_m2, geometria = excluded.geometria, ordem = excluded.ordem;",
  );
  add();

  add(
    "insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco, status)",
  );
  add("values");
  add(
    gerarUnidades(dados)
      .map(
        (u) =>
          `  (${q(e.id)}, ${q(u.tipologia_id)}, ${u.andar}, ${q(u.numero)}, ${u.posicao}, ${u.preco}, ${u.exibir_preco}, ${q(u.status)})`,
      )
      .join(",\n"),
  );
  add(
    "on conflict (empreendimento_id, numero) do update set tipologia_id = excluded.tipologia_id, andar = excluded.andar, posicao_no_andar = excluded.posicao_no_andar, preco = excluded.preco, exibir_preco = excluded.exibir_preco, status = excluded.status;",
  );

  return linhas.join("\n") + "\n";
}

export function lerDados() {
  return JSON.parse(readFileSync(ARQUIVO_JSON, "utf8"));
}

// Rodando direto (npm run db:seed:gerar): escreve o supabase/seed.sql.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(ARQUIVO_SQL, gerarSeedSql(lerDados()));
  console.log("supabase/seed.sql gerado.");
}
