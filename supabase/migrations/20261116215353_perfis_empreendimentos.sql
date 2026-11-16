-- Sprint 2, issue #13: perfis (corretores) e empreendimentos.
-- Modelo em docs/03-modelagem-de-dados.md.
--
-- Regras de segurança aplicadas em todas as tabelas:
-- 1) RLS ligado.
-- 2) GRANT explícito só das operações necessárias (tabelas novas não são
--    expostas na Data API automaticamente).
-- 3) Policies com (select auth.uid()) (avaliado 1 vez por consulta, não por linha).
-- 4) UPDATE sempre com USING e WITH CHECK (impede "transferir" a linha a outro dono).

-- ---------------------------------------------------------------------------
-- Schema privado para funções auxiliares (não exposto na API REST)
-- ---------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- Mantém atualizado_em em dia a cada UPDATE (reutilizado pelas próximas tabelas).
create function privado.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.tipo_empreendimento as enum ('predio', 'casa');
create type public.status_publicacao as enum ('rascunho', 'publicado', 'arquivado');

-- ---------------------------------------------------------------------------
-- perfis: um por usuário do Auth (o corretor)
-- ---------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  -- E.164: +5511999999999
  whatsapp text check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  creci text check (char_length(creci) <= 30),
  avatar_url text check (char_length(avatar_url) <= 500),
  logo_url text check (char_length(logo_url) <= 500),
  cor_marca text check (cor_marca ~ '^#[0-9a-fA-F]{6}$'),
  notificar_leads_email boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.perfis is 'Corretor: um perfil por usuário do Supabase Auth.';

-- Cria o perfil sozinho quando alguém se cadastra.
-- SECURITY DEFINER porque o usuário recém-criado ainda não pode inserir em perfis;
-- fica no schema privado e sem EXECUTE para os papéis da API.
create function privado.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- raw_user_meta_data é editável pelo usuário: usado só como nome inicial,
  -- nunca para decidir permissões.
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', ''), 120));
  return new;
end;
$$;

revoke execute on function privado.criar_perfil_para_novo_usuario()
  from public, anon, authenticated;

create trigger ao_criar_usuario_cria_perfil
  after insert on auth.users
  for each row execute function privado.criar_perfil_para_novo_usuario();

-- ---------------------------------------------------------------------------
-- empreendimentos: o que o corretor vende (prédio ou casa)
-- ---------------------------------------------------------------------------
create table public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references public.perfis (id) on delete cascade,
  tipo public.tipo_empreendimento not null default 'predio',
  nome text not null check (char_length(nome) between 1 and 120),
  -- Mesmo formato do slugify (src/lib/slugify.ts): a-z, 0-9 e hífens simples.
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  descricao text check (char_length(descricao) <= 5000),
  endereco text check (char_length(endereco) <= 200),
  cidade text check (char_length(cidade) <= 80),
  uf text check (uf ~ '^[A-Z]{2}$'),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  numero_andares integer check (numero_andares between 1 and 200),
  unidades_por_andar integer check (unidades_por_andar between 1 and 50),
  capa_url text check (char_length(capa_url) <= 500),
  -- Segurança da compra (docs/05, O6/O2)
  construtora text check (char_length(construtora) <= 120),
  registro_incorporacao text check (char_length(registro_incorporacao) <= 80),
  previsao_entrega date, -- null = imóvel pronto
  informacoes_conferidas_em date,
  status public.status_publicacao not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- Prédio precisa de andares e unidades por andar para gerar o 3D.
  constraint predio_tem_andares_e_unidades check (
    tipo <> 'predio' or (numero_andares is not null and unidades_por_andar is not null)
  )
);

comment on table public.empreendimentos is 'Prédio ou casa que o corretor apresenta no tour (/e/[slug]).';

create index empreendimentos_dono_id_idx on public.empreendimentos (dono_id);

create trigger empreendimentos_atualizado_em
  before update on public.empreendimentos
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS, GRANTs e policies
-- ---------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.empreendimentos enable row level security;

-- perfis ------------------------------------------------------------------
-- Visitante: só colunas públicas (GRANT por coluna). notificar_leads_email fica de fora.
grant select (id, nome, whatsapp, creci, avatar_url, logo_url, cor_marca)
  on public.perfis to anon;
-- Corretor logado: lê tudo do próprio perfil; edita só os campos do formulário.
-- Sem INSERT (o gatilho cria) e sem DELETE (apagar a conta apaga o perfil em cascata).
grant select on public.perfis to authenticated;
grant update (nome, whatsapp, creci, avatar_url, logo_url, cor_marca, notificar_leads_email)
  on public.perfis to authenticated;

-- Lê o próprio perfil, ou o de corretores com algum empreendimento publicado
-- (o tour mostra nome, WhatsApp, CRECI e marca do corretor).
create policy "perfis: leitura do próprio ou de quem publicou"
  on public.perfis
  for select
  to anon, authenticated
  using (
    (select auth.uid()) = id
    or exists (
      select 1
      from public.empreendimentos e
      where e.dono_id = perfis.id
        and e.status = 'publicado'
    )
  );

create policy "perfis: dono edita o próprio"
  on public.perfis
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- empreendimentos -----------------------------------------------------------
grant select on public.empreendimentos to anon;
grant select, insert, update, delete on public.empreendimentos to authenticated;

-- Uma policy de leitura só (várias policies permissivas pesam no desempenho).
create policy "empreendimentos: leitura dos publicados ou do dono"
  on public.empreendimentos
  for select
  to anon, authenticated
  using (status = 'publicado' or (select auth.uid()) = dono_id);

create policy "empreendimentos: dono cria"
  on public.empreendimentos
  for insert
  to authenticated
  with check ((select auth.uid()) = dono_id);

create policy "empreendimentos: dono edita"
  on public.empreendimentos
  for update
  to authenticated
  using ((select auth.uid()) = dono_id)
  with check ((select auth.uid()) = dono_id);

create policy "empreendimentos: dono apaga"
  on public.empreendimentos
  for delete
  to authenticated
  using ((select auth.uid()) = dono_id);
