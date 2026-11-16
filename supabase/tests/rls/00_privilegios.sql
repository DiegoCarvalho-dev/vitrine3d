-- Teste de privilégios (catálogo do Postgres): confere que a API só tem o acesso
-- planejado, sem depender de configuração do projeto. Só leitura do catálogo,
-- mas segue o mesmo formato dos outros testes (transação desfeita no fim). Uso:
--   supabase db query --remote --yes -f supabase/tests/rls/00_privilegios.sql
do $$
declare
  t text;
  p text;
  n int;
  r text := '';
begin
  -- Nenhuma tabela do public dá TRUNCATE, REFERENCES, TRIGGER ou MAINTAIN à API.
  foreach t in array array['saude', 'perfis', 'empreendimentos', 'tipologias', 'comodos', 'unidades'] loop
    foreach p in array array['TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      if has_table_privilege('anon', 'public.' || t, p) or has_table_privilege('authenticated', 'public.' || t, p) then
        r := r || format(E'\n[FALHOU] %s: API tem %s', t, p);
      else
        r := r || format(E'\n[OK] %s: sem %s para a API', t, p);
      end if;
    end loop;
  end loop;

  -- Visitante NÃO tem SELECT na tabela inteira onde há colunas protegidas.
  foreach t in array array['perfis', 'unidades'] loop
    r := r || format(E'\n[%s] %s: visitante sem SELECT na tabela inteira (só colunas)',
      case when has_table_privilege('anon', 'public.' || t, 'SELECT') then 'FALHOU' else 'OK' end, t);
  end loop;

  r := r || format(E'\n[%s] unidades.preco: visitante sem acesso',
    case when has_column_privilege('anon', 'public.unidades', 'preco', 'SELECT') then 'FALHOU' else 'OK' end);
  r := r || format(E'\n[%s] unidades.observacoes: visitante sem acesso',
    case when has_column_privilege('anon', 'public.unidades', 'observacoes', 'SELECT') then 'FALHOU' else 'OK' end);
  r := r || format(E'\n[%s] perfis.notificar_leads_email: visitante sem acesso',
    case when has_column_privilege('anon', 'public.perfis', 'notificar_leads_email', 'SELECT') then 'FALHOU' else 'OK' end);

  -- Corretor logado não altera colunas de controle.
  r := r || format(E'\n[%s] empreendimentos.dono_id: corretor não edita',
    case when has_column_privilege('authenticated', 'public.empreendimentos', 'dono_id', 'UPDATE') then 'FALHOU' else 'OK' end);
  r := r || format(E'\n[%s] unidades.empreendimento_id: corretor não edita',
    case when has_column_privilege('authenticated', 'public.unidades', 'empreendimento_id', 'UPDATE') then 'FALHOU' else 'OK' end);

  -- Permissões padrão: o que o postgres criar no public não nasce acessível pela API.
  select count(*) into n
  from pg_default_acl d
  join pg_namespace ns on ns.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where ns.nspname = 'public'
    and pg_get_userbyid(d.defaclrole) = 'postgres'
    and a.grantee in ('anon'::regrole, 'authenticated'::regrole);
  r := r || format(E'\n[%s] tabelas/funções novas do public nascem sem acesso da API (%s permissões padrão)',
    case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- Toda tabela do public tem RLS ligado.
  select count(*) into n
  from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  r := r || format(E'\n[%s] toda tabela do public tem RLS ligado (%s sem RLS)',
    case when n = 0 then 'OK' else 'FALHOU' end, n);

  raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM',
    (length(r) - length(replace(r, E'\n[', ''))) / 2,
    (length(r) - length(replace(r, '[OK]', ''))) / 4,
    coalesce((select string_agg(l, ' | ') from regexp_split_to_table(r, E'\n') as l where l like '[FALHOU]%'), '');
end
$$;
