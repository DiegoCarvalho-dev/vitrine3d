-- Tabela de teste de conexão ("health check"), usada pela página /lab/supabase.
-- Não faz parte do modelo do produto (docs/03); existe só para provar que
-- o Next.js consegue ler o banco com a chave pública e o RLS ativo.

create table public.saude (
  id smallint generated always as identity primary key,
  mensagem text not null check (char_length(mensagem) <= 100),
  criado_em timestamptz not null default now()
);

comment on table public.saude is
  'Health check da conexão Next.js -> Supabase (página /lab/supabase).';

-- 1) RLS ligado: sem uma policy que permita, ninguém lê nem escreve nada.
alter table public.saude enable row level security;

-- 2) Desde 2026 o Supabase não expõe tabelas novas na Data API automaticamente.
--    Liberamos SÓ a leitura (select) para os papéis da API. Nada de insert/update/delete.
grant select on table public.saude to anon, authenticated;

-- 3) Policy: qualquer visitante pode ler as linhas desta tabela (o conteúdo é público).
create policy "saude: leitura pública"
  on public.saude
  for select
  to anon, authenticated
  using (true);

-- 4) A linha que a página vai mostrar.
insert into public.saude (mensagem) values ('conectado');
