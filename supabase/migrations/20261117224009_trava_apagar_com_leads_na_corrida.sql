-- Fecha uma corrida na regra "empreendimento com leads não é apagado" (#29).
-- A policy de DELETE confere os leads no início do comando. Se um visitante
-- enviar um lead nesse mesmo instante, o DELETE espera a trava da chave
-- estrangeira e, depois, a cascata apagaria esse lead novo sem ninguém ver.
--
-- Este trigger roda DEPOIS de a linha ser travada e consulta os leads de novo
-- (já vendo o lead que acabou de chegar): se houver, cancela a exclusão.
-- Excluir a CONTA continua apagando tudo (LGPD): nesse caso o DELETE vem da
-- cascata de perfis (pg_trigger_depth() > 1) e o trigger deixa passar.

create function privado.impedir_apagar_empreendimento_com_leads()
returns trigger
language plpgsql
volatile
security definer -- lê leads sem depender do RLS de quem apaga
set search_path = ''
as $$
begin
  if pg_trigger_depth() = 1
     and exists (select 1 from public.leads l where l.empreendimento_id = old.id)
  then
    raise exception 'Este empreendimento tem leads e não pode ser excluído; arquive.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

revoke execute on function privado.impedir_apagar_empreendimento_com_leads()
  from public, anon, authenticated;

create trigger impedir_apagar_com_leads
  before delete on public.empreendimentos
  for each row execute function privado.impedir_apagar_empreendimento_com_leads();
