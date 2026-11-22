-- E-mail de novo lead (issue #70): o servidor precisa LER alguns dados que o
-- visitante não lê (o e-mail sai com o cliente admin, chave secreta, papel
-- service_role).
--
-- Problema: o projeto não expõe tabelas novas automaticamente (ver
-- 20261116221702_fecha_acesso_padrao_da_api), e isso vale também para o
-- service_role. Ele ignora o RLS, mas sem GRANT o Postgres responde
-- "permission denied" (42501) e o e-mail não saía.
--
-- Solução: só leitura, só nas tabelas que o e-mail usa. Nada de escrita e
-- nada em leads (o servidor nunca precisa ler os leads para avisar o corretor).

grant select on table
  public.empreendimentos,
  public.perfis,
  public.eventos,
  public.unidades,
  public.comodos
to service_role;
