-- Correção da trava "empreendimento publicado" (issue #84).
-- No PL/pgSQL o "and" não garante parar antes de ler new.comodo_id; numa
-- linha de leads (que não tem comodo_id) isso dava erro 42703 e recusava
-- todo lead. A checagem do cômodo agora fica num IF separado, só para eventos.

create or replace function privado.exigir_empreendimento_publicado()
returns trigger
language plpgsql
volatile
security definer -- lê empreendimentos/cômodos sem depender de quem grava
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.empreendimentos e
    where e.id = new.empreendimento_id and e.status = 'publicado'
  ) then
    raise exception 'Empreendimento não publicado.' using errcode = 'PT403';
  end if;
  if tg_table_name = 'eventos' then
    if not privado.comodo_do_empreendimento(new.comodo_id, new.empreendimento_id) then
      raise exception 'Cômodo de outro empreendimento.' using errcode = 'PT403';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function privado.exigir_empreendimento_publicado()
  from public, anon, authenticated;
