-- Ajustes da revisão da issue #84.
-- 1) O servidor não precisa ler tipologias (a conferência do cômodo é feita
--    pela trava do banco, que roda com o dono da função): sai o SELECT.
-- 2) privado.envios com RLS ligado (regra do projeto: RLS em toda tabela; sem
--    policy, só a função registrar_envio, que roda como dona, usa a tabela).
-- 3) A faxina apaga em lotes pequenos (nunca um DELETE grande no meio do
--    pedido do visitante).

revoke select on public.tipologias from service_role;

alter table privado.envios enable row level security;

create or replace function public.registrar_envio(
  p_escopo text,
  p_chave text,
  p_limite int,
  p_janela_segundos int
)
returns boolean
language plpgsql
volatile
security definer -- grava em privado.envios (fora da API)
set search_path = ''
as $$
begin
  if p_escopo !~ '^[a-z_]{1,20}$' or p_chave !~ '^[a-f0-9]{16,64}$'
     or p_limite < 1 or p_janela_segundos < 1 or p_janela_segundos > 86400 then
    return false;
  end if;
  -- Dois envios ao mesmo tempo da mesma chave não passam juntos do limite.
  perform pg_advisory_xact_lock(hashtext(p_escopo || ':' || p_chave));
  if (
    select count(*) from privado.envios v
    where v.escopo = p_escopo and v.chave = p_chave
      and v.criado_em > now() - make_interval(secs => p_janela_segundos)
  ) >= p_limite then
    return false;
  end if;
  insert into privado.envios (escopo, chave) values (p_escopo, p_chave);
  -- Faxina de vez em quando (1% das chamadas), em lote de no máximo 500
  -- linhas com mais de 1 dia: rápida, mesmo num dia movimentado.
  if random() < 0.01 then
    delete from privado.envios
    where ctid in (
      select ctid from privado.envios
      where criado_em < now() - interval '1 day'
      limit 500
    );
  end if;
  return true;
end;
$$;

revoke execute on function public.registrar_envio(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.registrar_envio(text, text, int, int)
  to service_role;
