-- Ajuste do limite de eventos (revisão da issue #67).
-- O teto por empreendimento (2000/min) deixava qualquer um "desligar" as
-- métricas de um empreendimento: bastava lotar o teto trocando o id de sessão
-- a cada envio, e aí as visitas reais eram recusadas. Fica só o limite por
-- sessão (60/min), que não prejudica outros visitantes. O erro ganha um código
-- próprio (PT429), para a rota não confundir com outros erros do banco.

create or replace function privado.limitar_eventos()
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
      using errcode = 'PT429';
  end if;
  return new;
end;
$$;

revoke execute on function privado.limitar_eventos()
  from public, anon, authenticated;
