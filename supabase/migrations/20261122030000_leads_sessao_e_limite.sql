-- Formulário de interesse (issue #69).
-- 1) leads.sessao_id: o mesmo id anônimo dos eventos (localStorage do
--    navegador). Liga o lead ao que a pessoa viu no tour, para o e-mail ao
--    corretor (#70) e o termômetro de interesse (#73). Opcional: o lead vale
--    mesmo sem ele.
-- 2) Limite contra spam direto no banco (a chave pública permite inserir sem
--    passar pelo site): até 5 leads por sessão a cada 10 minutos. Sem teto por
--    empreendimento, que deixaria qualquer um bloquear os leads reais (#67).

alter table public.leads
  add column sessao_id text check (sessao_id ~ '^[A-Za-z0-9_-]{8,64}$');

create index leads_sessao_idx on public.leads (sessao_id, criado_em desc);

-- O visitante passa a poder informar a sessão (só ela, além das de antes).
grant insert (sessao_id) on public.leads to anon;

create function privado.limitar_leads()
returns trigger
language plpgsql
volatile
security definer -- conta leads sem depender do RLS (o visitante não lê)
set search_path = ''
as $$
begin
  if new.sessao_id is not null and (
    select count(*) from public.leads l
    where l.sessao_id = new.sessao_id
      and l.criado_em > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Muitos envios desta sessão; tente mais tarde.'
      using errcode = 'PT429';
  end if;
  return new;
end;
$$;

revoke execute on function privado.limitar_leads()
  from public, anon, authenticated;

create trigger limitar_leads
  before insert on public.leads
  for each row execute function privado.limitar_leads();
