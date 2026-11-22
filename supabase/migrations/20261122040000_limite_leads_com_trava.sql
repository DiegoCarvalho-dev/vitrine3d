-- Ajuste do limite de leads (revisão da issue #69).
-- Envios em paralelo da mesma sessão não se enxergavam na contagem e podiam
-- passar do limite. Agora o trigger trava a sessão (advisory lock da
-- transação) antes de contar.
-- Limitação conhecida: quem insere direto pela chave pública pode omitir ou
-- trocar o sessao_id a cada envio; esse limite protege o formulário do site,
-- não a API crua. A proteção completa (inserir só pelo servidor) está no
-- roteiro da Sprint 7.

create or replace function privado.limitar_leads()
returns trigger
language plpgsql
volatile
security definer -- conta leads sem depender do RLS (o visitante não lê)
set search_path = ''
as $$
begin
  if new.sessao_id is not null then
    perform pg_advisory_xact_lock(hashtext('leads:' || new.sessao_id));
    if (
      select count(*) from public.leads l
      where l.sessao_id = new.sessao_id
        and l.criado_em > now() - interval '10 minutes'
    ) >= 5 then
      raise exception 'Muitos envios desta sessão; tente mais tarde.'
        using errcode = 'PT429';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function privado.limitar_leads()
  from public, anon, authenticated;
