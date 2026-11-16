-- O projeto foi criado com a opção "Enable automatic RLS", que instala a função
-- public.rls_auto_enable() (SECURITY DEFINER) e um event trigger que liga o RLS
-- em toda tabela nova do schema public.
--
-- Por estar no schema public, o Postgres dá EXECUTE para PUBLIC por padrão, e a
-- função fica "chamável" pela API (/rest/v1/rpc/rls_auto_enable) por anon e
-- authenticated. Hoje a chamada falha (função do tipo event_trigger), mas uma
-- função privilegiada exposta é risco desnecessário (advisors 0028 e 0029).
--
-- Revogar EXECUTE não afeta o event trigger: o Postgres o dispara sozinho.
-- O "if exists" deixa a migration segura em bancos criados sem essa opção
-- (ex.: um banco local de desenvolvimento).

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
