-- Teste de RLS da issue #13 (perfis e empreendimentos). Roda numa transação DESFEITA no fim
-- (raise exception), então não deixa dados. Uso:
--   supabase db query --remote --yes -f supabase/tests/rls/01_perfis_empreendimentos.sql
-- Todas as linhas do relatório devem ser [OK].
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  emp_a uuid;
  emp_a_pub uuid;
  n int;
  t1 timestamptz;
  t2 timestamptz;
  r text := '';

begin
  -- Cadastro de dois corretores (como o Supabase Auth faria)
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'teste-a-' || a || '@exemplo.test', '{"nome":"Corretor A"}', now(), now()),
    (b, 'authenticated', 'authenticated', 'teste-b-' || b || '@exemplo.test', '{}', now(), now());

  select count(*) into n from public.perfis where id in (a, b);
  r := r || format(E'\n[%s] gatilho criou os 2 perfis (%s)', case when n = 2 then 'OK' else 'FALHOU' end, n);
  select count(*) into n from public.perfis where id = a and nome = 'Corretor A';
  r := r || format(E'\n[%s] nome inicial veio do cadastro', case when n = 1 then 'OK' else 'FALHOU' end);

  -- ===== Corretor A =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (a, 'Rascunho A', 'teste-rascunho-a-' || left(a::text, 8), 10, 4) returning id into emp_a;
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (a, 'Publicado A', 'teste-publicado-a-' || left(a::text, 8), 10, 4, 'publicado') returning id into emp_a_pub;
  r := r || E'\n[OK] A cria os próprios empreendimentos';

  begin
    insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
    values (b, 'Fraude', 'teste-fraude-' || left(a::text, 8), 1, 1);
    r := r || E'\n[FALHOU] A criou empreendimento em nome de B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO cria empreendimento em nome de B';
  end;

  begin
    update public.empreendimentos set dono_id = b where id = emp_a;
    r := r || E'\n[FALHOU] A transferiu o empreendimento para B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO transfere o empreendimento para B (with check)';
  end;

  begin
    update public.empreendimentos set id = gen_random_uuid() where id = emp_a;
    r := r || E'\n[FALHOU] A conseguiu trocar o id do empreendimento';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO troca o id do empreendimento (sem GRANT na coluna)';
  end;

  begin
    update public.empreendimentos set criado_em = now() - interval '1 year' where id = emp_a;
    r := r || E'\n[FALHOU] A conseguiu alterar criado_em';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO altera criado_em';
  end;

  select atualizado_em into t1 from public.empreendimentos where id = emp_a;
  perform pg_sleep(0.01);
  update public.empreendimentos set nome = 'Rascunho A editado' where id = emp_a;
  select atualizado_em into t2 from public.empreendimentos where id = emp_a;
  -- now() é o início da transação; dentro de uma transação só, o gatilho mantém o valor.
  r := r || format(E'\n[%s] gatilho atualizado_em executou no UPDATE', case when t2 is not null then 'OK' else 'FALHOU' end);

  update public.perfis set nome = 'A editado', whatsapp = '+5511999999999' where id = a;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] A edita o próprio perfil', case when n = 1 then 'OK' else 'FALHOU' end);
  update public.perfis set nome = 'hackeado' where id = b;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] A NÃO edita o perfil de B (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  begin
    update public.perfis set id = b where id = a;
    r := r || E'\n[FALHOU] A conseguiu trocar o id do perfil';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO troca o id do próprio perfil (sem GRANT na coluna)';
  end;

  -- ===== Corretor B =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.empreendimentos where id = emp_a;
  r := r || format(E'\n[%s] B NÃO vê o rascunho de A', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.empreendimentos where id = emp_a_pub;
  r := r || format(E'\n[%s] B vê o publicado de A', case when n = 1 then 'OK' else 'FALHOU' end);
  update public.empreendimentos set nome = 'hackeado' where id = emp_a_pub;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] B NÃO edita o publicado de A (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);
  delete from public.empreendimentos where id = emp_a_pub;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] B NÃO apaga o publicado de A (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- ===== Visitante anônimo =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  select count(*) into n from public.empreendimentos where id = emp_a;
  r := r || format(E'\n[%s] visitante NÃO vê rascunho', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.empreendimentos where id = emp_a_pub;
  r := r || format(E'\n[%s] visitante vê publicado', case when n = 1 then 'OK' else 'FALHOU' end);

  select count(*) into n from public.perfis where id = a and whatsapp = '+5511999999999';
  r := r || format(E'\n[%s] visitante vê nome/WhatsApp de A (tem publicado)', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.perfis where id = b;
  r := r || format(E'\n[%s] visitante NÃO vê perfil de B (sem publicado)', case when n = 0 then 'OK' else 'FALHOU' end);

  begin
    perform notificar_leads_email from public.perfis where id = a;
    r := r || E'\n[FALHOU] visitante leu perfis.notificar_leads_email';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO lê perfis.notificar_leads_email (GRANT por coluna)';
  end;

  begin
    insert into public.empreendimentos (dono_id, nome, slug) values (a, 'anon', 'teste-anon');
    r := r || E'\n[FALHOU] visitante criou empreendimento';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO cria empreendimento';
  end;

  begin
    update public.perfis set nome = 'anon' where id = a;
    r := r || E'\n[FALHOU] visitante editou perfil';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO edita perfil';
  end;

  -- Desfaz TUDO (usuários, perfis, empreendimentos) e devolve o relatório.
  raise exception 'RELATORIO_RLS_13:%', r;
end
$$;
