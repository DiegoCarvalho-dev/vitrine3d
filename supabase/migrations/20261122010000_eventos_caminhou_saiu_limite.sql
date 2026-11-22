-- Eventos de visita (issue #67).
-- 1) Dois tipos novos: "caminhou" (entrou no modo caminhar da unidade) e
--    "saiu" (ao sair da página, com o tempo nela em dados.segundos).
-- 2) Limite contra abuso direto no banco: a chave pública permite inserir
--    eventos sem passar pela rota do site, então a trava fica aqui.
--    Por sessão: até 60 eventos por minuto. Por empreendimento: até 2000 por
--    minuto (quem troca o id de sessão a cada envio para aqui).

alter type public.tipo_evento add value if not exists 'caminhou';
alter type public.tipo_evento add value if not exists 'saiu';

create function privado.limitar_eventos()
returns trigger
language plpgsql
volatile
security definer -- conta eventos sem depender do RLS (o visitante não lê)
set search_path = ''
as $$
begin
  if (
    select count(*) from public.eventos e
    where e.sessao_id = new.sessao_id
      and e.criado_em > now() - interval '1 minute'
  ) >= 60 then
    raise exception 'Muitos eventos desta sessão; tente mais tarde.'
      using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.eventos e
    where e.empreendimento_id = new.empreendimento_id
      and e.criado_em > now() - interval '1 minute'
  ) >= 2000 then
    raise exception 'Muitos eventos neste empreendimento; tente mais tarde.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function privado.limitar_eventos()
  from public, anon, authenticated;

create trigger limitar_eventos
  before insert on public.eventos
  for each row execute function privado.limitar_eventos();

-- A contagem por sessão olha só o último minuto: índice com a data.
drop index if exists public.eventos_sessao_idx;
create index eventos_sessao_criado_idx on public.eventos (sessao_id, criado_em desc);
