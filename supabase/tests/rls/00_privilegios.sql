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
  foreach t in array array['saude', 'perfis', 'empreendimentos', 'tipologias', 'comodos', 'unidades', 'midias', 'hotspots', 'leads', 'eventos'] loop
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

  -- leads e eventos: visitante só insere, não lê nenhuma coluna, não altera, não apaga.
  foreach t in array array['leads', 'eventos'] loop
    select count(*) into n
    from information_schema.column_privileges
    where table_schema = 'public' and table_name = t and grantee = 'anon' and privilege_type = 'SELECT';
    r := r || format(E'\n[%s] %s: visitante não lê nenhuma coluna (%s)',
      case when n = 0 and not has_table_privilege('anon', 'public.' || t, 'SELECT') then 'OK' else 'FALHOU' end, t, n);
    r := r || format(E'\n[%s] %s: visitante não altera nem apaga',
      case when has_table_privilege('anon', 'public.' || t, 'UPDATE') or has_table_privilege('anon', 'public.' || t, 'DELETE') then 'FALHOU' else 'OK' end, t);
  end loop;
  r := r || format(E'\n[%s] leads.status: visitante não escolhe',
    case when has_column_privilege('anon', 'public.leads', 'status', 'INSERT') then 'FALHOU' else 'OK' end);
  r := r || format(E'\n[%s] leads.consentimento_em: visitante não escolhe',
    case when has_column_privilege('anon', 'public.leads', 'consentimento_em', 'INSERT') then 'FALHOU' else 'OK' end);

  -- Corretor logado não altera colunas de controle.
  r := r || format(E'\n[%s] empreendimentos.dono_id: corretor não edita',
    case when has_column_privilege('authenticated', 'public.empreendimentos', 'dono_id', 'UPDATE') then 'FALHOU' else 'OK' end);
  r := r || format(E'\n[%s] unidades.empreendimento_id: corretor não edita',
    case when has_column_privilege('authenticated', 'public.unidades', 'empreendimento_id', 'UPDATE') then 'FALHOU' else 'OK' end);

  -- Permissões padrão: TABELAS e SEQUÊNCIAS que o postgres criar no public não
  -- nascem acessíveis pela API (o Supabase dá essas permissões por schema, e a
  -- migration fecha_acesso_padrao_da_api as retirou).
  select count(*) into n
  from pg_default_acl d
  join pg_namespace ns on ns.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) a
  where ns.nspname = 'public'
    and d.defaclobjtype in ('r', 'S')
    and pg_get_userbyid(d.defaclrole) = 'postgres'
    and a.grantee in ('anon'::regrole, 'authenticated'::regrole);
  r := r || format(E'\n[%s] tabelas/sequências novas do public nascem sem acesso da API (%s permissões padrão)',
    case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- FUNÇÕES: o Postgres dá EXECUTE a PUBLIC de forma GLOBAL, e isso não se
  -- revoga por schema. Por isso a regra é: toda função criada nas nossas
  -- migrations (public e privado) faz `revoke execute ... from public, anon,
  -- authenticated`, e este teste falha se alguma ficar aberta sem estar na lista
  -- de liberadas. has_function_privilege já considera o que vem de PUBLIC.
  -- Funções de extensões (pg_depend deptype 'e') ficam de fora.
  for t in
    select ns.nspname || '.' || p.proname
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname in ('public', 'privado')
      and not exists (
        select 1 from pg_depend dep
        where dep.classid = 'pg_proc'::regclass and dep.objid = p.oid and dep.deptype = 'e'
      )
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
           or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
      -- Liberadas de propósito (usadas dentro das policies):
      and (ns.nspname, p.proname) not in (('privado', 'comodo_do_empreendimento'), ('privado', 'pode_gravar_midia'), ('privado', 'empreendimento_tem_leads'))
  loop
    r := r || format(E'\n[FALHOU] função %s executável pela API (faltou revoke execute)', t);
  end loop;
  r := r || E'\n[OK] varredura de funções do public e do privado concluída';

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
