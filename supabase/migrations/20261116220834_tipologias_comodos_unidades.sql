-- Sprint 2, issue #14: tipologias, cômodos e unidades.
-- Segue os padrões de RLS do docs/03 (GRANT explícito, (select auth.uid()),
-- UPDATE com USING + WITH CHECK, colunas editáveis limitadas).
--
-- Preço "sob consulta": RLS filtra linhas, não colunas, e GRANT por coluna vale
-- para o papel inteiro. Por isso:
-- - preco_publico é uma coluna GERADA (preco só quando exibir_preco = true);
-- - o visitante (anon) recebe GRANT só de preco_publico, nunca de preco;
-- - o corretor logado (authenticated) vê SÓ as próprias unidades. Assim um
--   concorrente logado não lê o preço "sob consulta" de outro corretor.
--   Páginas públicas leem com cliente anônimo (sem cookies de login).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.tipo_comodo as enum (
  'sala', 'quarto', 'suite', 'cozinha', 'banheiro', 'varanda', 'lavanderia', 'outro'
);
create type public.status_unidade as enum ('disponivel', 'reservado', 'vendido');

-- ---------------------------------------------------------------------------
-- tipologias: planta que se repete ("Tipo A, 2 quartos, 65 m²")
-- ---------------------------------------------------------------------------
create table public.tipologias (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  quartos smallint not null default 0 check (quartos between 0 and 20),
  suites smallint not null default 0 check (suites between 0 and 20),
  banheiros smallint not null default 0 check (banheiros between 0 and 20),
  vagas smallint not null default 0 check (vagas between 0 and 20),
  area_privativa_m2 numeric(8, 2) check (area_privativa_m2 > 0 and area_privativa_m2 <= 10000),
  -- Formato validado por Zod na aplicação (docs/03, "Formato da planta").
  planta jsonb not null default '{"versao": 1, "portas": [], "janelas": []}'::jsonb
    check (jsonb_typeof(planta) = 'object' and pg_column_size(planta) <= 100000),
  planta_imagem_url text check (char_length(planta_imagem_url) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tipologias_nome_unico unique (empreendimento_id, nome),
  -- Permite a FK composta de unidades (tipologia do MESMO empreendimento).
  constraint tipologias_id_empreendimento_unico unique (id, empreendimento_id)
);

create trigger tipologias_atualizado_em
  before update on public.tipologias
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- comodos: partes de uma tipologia, com geometria em metros
-- ---------------------------------------------------------------------------
create table public.comodos (
  id uuid primary key default gen_random_uuid(),
  tipologia_id uuid not null references public.tipologias (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  tipo public.tipo_comodo not null default 'outro',
  descricao text check (char_length(descricao) <= 2000),
  area_m2 numeric(7, 2) check (area_m2 > 0 and area_m2 <= 5000),
  -- {"tipo":"poligono","pontos":[[0,0],[4,0],[4,3.5],[0,3.5]],"pe_direito":2.7}
  geometria jsonb not null
    check (jsonb_typeof(geometria) = 'object' and pg_column_size(geometria) <= 20000),
  ordem smallint not null default 0
);

create index comodos_tipologia_id_idx on public.comodos (tipologia_id);

-- ---------------------------------------------------------------------------
-- unidades: o apartamento concreto (902), com preço e status
-- ---------------------------------------------------------------------------
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  tipologia_id uuid,
  andar smallint not null check (andar between 0 and 200), -- 0 = térreo
  numero text not null check (char_length(numero) between 1 and 10),
  posicao_no_andar smallint not null check (posicao_no_andar between 1 and 50),
  preco numeric(14, 2) check (preco >= 0),
  -- Padrão seguro: nasce "sob consulta"; o corretor escolhe mostrar o preço.
  exibir_preco boolean not null default false,
  preco_publico numeric(14, 2)
    generated always as (case when exibir_preco then preco end) stored,
  status public.status_unidade not null default 'disponivel',
  observacoes text check (char_length(observacoes) <= 1000), -- nota interna do corretor
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint unidades_numero_unico unique (empreendimento_id, numero),
  constraint unidades_posicao_unica unique (empreendimento_id, andar, posicao_no_andar),
  -- A tipologia precisa ser do MESMO empreendimento. Se a tipologia for apagada,
  -- a unidade continua, só sem tipologia.
  constraint unidades_tipologia_do_mesmo_empreendimento
    foreign key (tipologia_id, empreendimento_id)
    references public.tipologias (id, empreendimento_id)
    on delete set null (tipologia_id)
);

create index unidades_empreendimento_status_idx on public.unidades (empreendimento_id, status);
create index unidades_tipologia_idx on public.unidades (tipologia_id, empreendimento_id);

create trigger unidades_atualizado_em
  before update on public.unidades
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS, GRANTs e policies
-- ---------------------------------------------------------------------------
alter table public.tipologias enable row level security;
alter table public.comodos enable row level security;
alter table public.unidades enable row level security;

-- tipologias ------------------------------------------------------------------
grant select on public.tipologias to anon;
grant select, insert, delete on public.tipologias to authenticated;
grant update (nome, quartos, suites, banheiros, vagas, area_privativa_m2, planta, planta_imagem_url)
  on public.tipologias to authenticated;

create policy "tipologias: leitura se publicado ou do dono"
  on public.tipologias for select to anon, authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = tipologias.empreendimento_id
      and (e.status = 'publicado' or e.dono_id = (select auth.uid()))
  ));

create policy "tipologias: dono cria"
  on public.tipologias for insert to authenticated
  with check (exists (
    select 1 from public.empreendimentos e
    where e.id = tipologias.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "tipologias: dono edita"
  on public.tipologias for update to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = tipologias.empreendimento_id and e.dono_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.empreendimentos e
    where e.id = tipologias.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "tipologias: dono apaga"
  on public.tipologias for delete to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = tipologias.empreendimento_id and e.dono_id = (select auth.uid())
  ));

-- comodos ---------------------------------------------------------------------
grant select on public.comodos to anon;
grant select, insert, delete on public.comodos to authenticated;
grant update (nome, tipo, descricao, area_m2, geometria, ordem)
  on public.comodos to authenticated;

create policy "comodos: leitura se publicado ou do dono"
  on public.comodos for select to anon, authenticated
  using (exists (
    select 1 from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = comodos.tipologia_id
      and (e.status = 'publicado' or e.dono_id = (select auth.uid()))
  ));

create policy "comodos: dono cria"
  on public.comodos for insert to authenticated
  with check (exists (
    select 1 from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = comodos.tipologia_id and e.dono_id = (select auth.uid())
  ));

create policy "comodos: dono edita"
  on public.comodos for update to authenticated
  using (exists (
    select 1 from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = comodos.tipologia_id and e.dono_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = comodos.tipologia_id and e.dono_id = (select auth.uid())
  ));

create policy "comodos: dono apaga"
  on public.comodos for delete to authenticated
  using (exists (
    select 1 from public.tipologias t
    join public.empreendimentos e on e.id = t.empreendimento_id
    where t.id = comodos.tipologia_id and e.dono_id = (select auth.uid())
  ));

-- unidades --------------------------------------------------------------------
-- Visitante: só colunas públicas. Sem preco e sem observacoes.
grant select (
  id, empreendimento_id, tipologia_id, andar, numero, posicao_no_andar,
  exibir_preco, preco_publico, status
) on public.unidades to anon;

grant select, delete on public.unidades to authenticated;
grant insert (
  empreendimento_id, tipologia_id, andar, numero, posicao_no_andar,
  preco, exibir_preco, status, observacoes
) on public.unidades to authenticated;
grant update (
  tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco, status, observacoes
) on public.unidades to authenticated;

create policy "unidades: visitante lê as publicadas"
  on public.unidades for select to anon
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.status = 'publicado'
  ));

-- Corretor logado vê SÓ as próprias (protege o preço "sob consulta" de concorrentes).
create policy "unidades: dono lê as próprias"
  on public.unidades for select to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "unidades: dono cria"
  on public.unidades for insert to authenticated
  with check (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "unidades: dono edita"
  on public.unidades for update to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.dono_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "unidades: dono apaga"
  on public.unidades for delete to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = unidades.empreendimento_id and e.dono_id = (select auth.uid())
  ));
