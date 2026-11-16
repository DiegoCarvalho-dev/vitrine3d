-- Sprint 2, issue #15: mídias, hotspots, leads e eventos.
-- leads e eventos são as únicas tabelas em que o VISITANTE escreve:
-- - o visitante só INSERE (nunca lê, altera ou apaga);
-- - só em empreendimento publicado;
-- - colunas de controle (status, datas, id) são preenchidas pelo banco;
-- - nenhuma referência cruzada (unidade/cômodo de outro empreendimento).
-- Lembrete: desde a migration fecha_acesso_padrao_da_api, nada nasce acessível
-- pela API; todo acesso abaixo é GRANT explícito.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.tipo_midia as enum ('foto', 'panorama_360', 'video', 'splat');
create type public.status_lead as enum ('novo', 'em_contato', 'visita_agendada', 'ganho', 'perdido');
create type public.tipo_evento as enum (
  'abriu_tour', 'abriu_unidade', 'viu_comodo', 'clicou_whatsapp', 'enviou_lead'
);

-- Permite FKs compostas "unidade do MESMO empreendimento".
alter table public.unidades
  add constraint unidades_id_empreendimento_unico unique (id, empreendimento_id);

-- Cômodo pertence ao empreendimento? (usado nas policies de WITH CHECK)
-- SECURITY INVOKER: respeita o RLS de quem chama. Fica no schema privado,
-- com EXECUTE só para os papéis que precisam usar nas policies.
create function privado.comodo_do_empreendimento(p_comodo uuid, p_empreendimento uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_comodo is null or exists (
    select 1
    from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    where c.id = p_comodo and t.empreendimento_id = p_empreendimento
  );
$$;

revoke execute on function privado.comodo_do_empreendimento(uuid, uuid) from public;
-- O schema privado não é exposto na API (só o public é); USAGE só permite que as
-- policies chamem a função acima. As outras funções do privado ficam sem EXECUTE
-- (gatilhos não precisam dessa permissão para rodar).
revoke execute on function privado.definir_atualizado_em() from public, anon, authenticated;
grant usage on schema privado to anon, authenticated;
grant execute on function privado.comodo_do_empreendimento(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- midias: fotos, 360°, vídeos (arquivos no Storage, Sprint 3)
-- ---------------------------------------------------------------------------
create table public.midias (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  unidade_id uuid,
  comodo_id uuid references public.comodos (id) on delete set null,
  tipo public.tipo_midia not null default 'foto',
  caminho_storage text not null check (char_length(caminho_storage) between 1 and 500),
  legenda text check (char_length(legenda) <= 300),
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  constraint midias_id_empreendimento_unico unique (id, empreendimento_id),
  constraint midias_unidade_do_mesmo_empreendimento
    foreign key (unidade_id, empreendimento_id)
    references public.unidades (id, empreendimento_id)
    on delete set null (unidade_id)
);

create index midias_empreendimento_idx on public.midias (empreendimento_id, ordem);
create index midias_unidade_idx on public.midias (unidade_id, empreendimento_id);
create index midias_comodo_idx on public.midias (comodo_id);

-- ---------------------------------------------------------------------------
-- hotspots: etiquetas clicáveis dentro do 3D
-- ---------------------------------------------------------------------------
create table public.hotspots (
  id uuid primary key default gen_random_uuid(),
  comodo_id uuid not null references public.comodos (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 80),
  descricao text check (char_length(descricao) <= 1000),
  -- {"x": 1.2, "y": 1.6, "z": 0.5} em metros
  posicao jsonb not null
    check (jsonb_typeof(posicao) = 'object' and pg_column_size(posicao) <= 500),
  midia_id uuid references public.midias (id) on delete set null
);

create index hotspots_comodo_idx on public.hotspots (comodo_id);
create index hotspots_midia_idx on public.hotspots (midia_id);

-- ---------------------------------------------------------------------------
-- leads: pessoa interessada (formulário com consentimento LGPD)
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  unidade_id uuid,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  telefone text check (char_length(telefone) between 8 and 30),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mensagem text check (char_length(mensagem) <= 2000),
  origem text check (char_length(origem) <= 100), -- utm_source / campanha
  consentimento_lgpd boolean not null check (consentimento_lgpd),
  consentimento_em timestamptz not null default now(), -- hora do servidor, não do navegador
  status public.status_lead not null default 'novo',
  criado_em timestamptz not null default now(),
  constraint leads_tem_contato check (telefone is not null or email is not null),
  constraint leads_unidade_do_mesmo_empreendimento
    foreign key (unidade_id, empreendimento_id)
    references public.unidades (id, empreendimento_id)
    on delete set null (unidade_id)
);

create index leads_empreendimento_criado_idx on public.leads (empreendimento_id, criado_em desc);
create index leads_unidade_idx on public.leads (unidade_id, empreendimento_id);

-- ---------------------------------------------------------------------------
-- eventos: navegação anônima (analytics e termômetro de interesse)
-- ---------------------------------------------------------------------------
create table public.eventos (
  id bigint generated always as identity primary key,
  empreendimento_id uuid not null references public.empreendimentos (id) on delete cascade,
  unidade_id uuid,
  comodo_id uuid references public.comodos (id) on delete set null,
  sessao_id text not null check (sessao_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  tipo public.tipo_evento not null,
  dados jsonb not null default '{}'::jsonb
    check (jsonb_typeof(dados) = 'object' and pg_column_size(dados) <= 2000),
  criado_em timestamptz not null default now(),
  constraint eventos_unidade_do_mesmo_empreendimento
    foreign key (unidade_id, empreendimento_id)
    references public.unidades (id, empreendimento_id)
    on delete set null (unidade_id)
);

create index eventos_empreendimento_criado_idx on public.eventos (empreendimento_id, criado_em desc);
create index eventos_sessao_idx on public.eventos (sessao_id);
create index eventos_unidade_idx on public.eventos (unidade_id, empreendimento_id);
create index eventos_comodo_idx on public.eventos (comodo_id);

-- ---------------------------------------------------------------------------
-- RLS, GRANTs e policies
-- ---------------------------------------------------------------------------
alter table public.midias enable row level security;
alter table public.hotspots enable row level security;
alter table public.leads enable row level security;
alter table public.eventos enable row level security;

-- midias ------------------------------------------------------------------------
grant select on public.midias to anon;
grant select, delete on public.midias to authenticated;
grant insert (empreendimento_id, unidade_id, comodo_id, tipo, caminho_storage, legenda, ordem)
  on public.midias to authenticated;
grant update (unidade_id, comodo_id, tipo, caminho_storage, legenda, ordem)
  on public.midias to authenticated;

create policy "midias: leitura se publicado ou do dono"
  on public.midias for select to anon, authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = midias.empreendimento_id
      and (e.status = 'publicado' or e.dono_id = (select auth.uid()))
  ));

create policy "midias: dono cria"
  on public.midias for insert to authenticated
  with check (
    exists (
      select 1 from public.empreendimentos e
      where e.id = midias.empreendimento_id and e.dono_id = (select auth.uid())
    )
    and privado.comodo_do_empreendimento(comodo_id, empreendimento_id)
  );

create policy "midias: dono edita"
  on public.midias for update to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = midias.empreendimento_id and e.dono_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.empreendimentos e
      where e.id = midias.empreendimento_id and e.dono_id = (select auth.uid())
    )
    and privado.comodo_do_empreendimento(comodo_id, empreendimento_id)
  );

create policy "midias: dono apaga"
  on public.midias for delete to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = midias.empreendimento_id and e.dono_id = (select auth.uid())
  ));

-- hotspots ----------------------------------------------------------------------
grant select on public.hotspots to anon;
grant select, delete on public.hotspots to authenticated;
grant insert (comodo_id, titulo, descricao, posicao, midia_id) on public.hotspots to authenticated;
grant update (titulo, descricao, posicao, midia_id) on public.hotspots to authenticated;

create policy "hotspots: leitura se publicado ou do dono"
  on public.hotspots for select to anon, authenticated
  using (exists (
    select 1 from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    join public.empreendimentos e on e.id = t.empreendimento_id
    where c.id = hotspots.comodo_id
      and (e.status = 'publicado' or e.dono_id = (select auth.uid()))
  ));

-- A mídia ligada ao hotspot precisa ser do mesmo empreendimento do cômodo.
create policy "hotspots: dono cria"
  on public.hotspots for insert to authenticated
  with check (exists (
    select 1 from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    join public.empreendimentos e on e.id = t.empreendimento_id
    where c.id = hotspots.comodo_id
      and e.dono_id = (select auth.uid())
      and (hotspots.midia_id is null or exists (
        select 1 from public.midias m
        where m.id = hotspots.midia_id and m.empreendimento_id = e.id
      ))
  ));

create policy "hotspots: dono edita"
  on public.hotspots for update to authenticated
  using (exists (
    select 1 from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    join public.empreendimentos e on e.id = t.empreendimento_id
    where c.id = hotspots.comodo_id and e.dono_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    join public.empreendimentos e on e.id = t.empreendimento_id
    where c.id = hotspots.comodo_id
      and e.dono_id = (select auth.uid())
      and (hotspots.midia_id is null or exists (
        select 1 from public.midias m
        where m.id = hotspots.midia_id and m.empreendimento_id = e.id
      ))
  ));

create policy "hotspots: dono apaga"
  on public.hotspots for delete to authenticated
  using (exists (
    select 1 from public.comodos c
    join public.tipologias t on t.id = c.tipologia_id
    join public.empreendimentos e on e.id = t.empreendimento_id
    where c.id = hotspots.comodo_id and e.dono_id = (select auth.uid())
  ));

-- leads -------------------------------------------------------------------------
-- Visitante: só INSERT, só destas colunas (status, consentimento_em, datas e id
-- ficam com o banco). Sem SELECT: nem o próprio lead ele lê de volta.
grant insert (empreendimento_id, unidade_id, nome, telefone, email, mensagem, origem, consentimento_lgpd)
  on public.leads to anon;
-- Corretor: lê, muda o status e apaga (ex.: pedido de exclusão LGPD) os seus.
grant select, delete on public.leads to authenticated;
grant update (status) on public.leads to authenticated;

create policy "leads: visitante envia para empreendimento publicado"
  on public.leads for insert to anon
  with check (
    consentimento_lgpd
    and exists (
      select 1 from public.empreendimentos e
      where e.id = leads.empreendimento_id and e.status = 'publicado'
    )
  );

create policy "leads: dono lê os seus"
  on public.leads for select to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = leads.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "leads: dono atualiza o status"
  on public.leads for update to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = leads.empreendimento_id and e.dono_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.empreendimentos e
    where e.id = leads.empreendimento_id and e.dono_id = (select auth.uid())
  ));

create policy "leads: dono apaga"
  on public.leads for delete to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = leads.empreendimento_id and e.dono_id = (select auth.uid())
  ));

-- eventos -----------------------------------------------------------------------
-- Visitante: só INSERT. Eventos são imutáveis (ninguém altera).
grant insert (empreendimento_id, unidade_id, comodo_id, sessao_id, tipo, dados)
  on public.eventos to anon;
grant select on public.eventos to authenticated;

create policy "eventos: visitante registra em empreendimento publicado"
  on public.eventos for insert to anon
  with check (
    exists (
      select 1 from public.empreendimentos e
      where e.id = eventos.empreendimento_id and e.status = 'publicado'
    )
    and privado.comodo_do_empreendimento(comodo_id, empreendimento_id)
  );

create policy "eventos: dono lê os seus"
  on public.eventos for select to authenticated
  using (exists (
    select 1 from public.empreendimentos e
    where e.id = eventos.empreendimento_id and e.dono_id = (select auth.uid())
  ));
