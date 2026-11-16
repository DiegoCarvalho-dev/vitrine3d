-- Teste da issue #16: ciclo de vida dos dados. Roda numa transação DESFEITA no
-- fim, então não deixa dados. Uso: npm run test:rls
-- Cobre: empreendimento arquivado, perfil de quem não tem nada publicado e
-- exclusão da conta do corretor em cascata.
do $$
declare
  a uuid := gen_random_uuid();
  c uuid := gen_random_uuid(); -- corretor com rascunho e arquivado, nada publicado
  emp_pub uuid;
  emp_arq uuid;
  emp_c_rasc uuid;
  emp_c_arq uuid;
  tip uuid;
  com uuid;
  uni uuid;
  uni_arq uuid;
  mid uuid;
  n int;
  r text := '';
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'teste-a-' || a || '@exemplo.test', '{"nome":"A"}', now(), now()),
    (c, 'authenticated', 'authenticated', 'teste-c-' || c || '@exemplo.test', '{"nome":"C"}', now(), now());

  -- ===== Montagem: A com um publicado completo e um arquivado =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (a, 'Pub A', 'teste-pub-' || left(a::text, 8), 10, 4, 'publicado') returning id into emp_pub;
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (a, 'Arq A', 'teste-arq-' || left(a::text, 8), 10, 4, 'arquivado') returning id into emp_arq;
  insert into public.tipologias (empreendimento_id, nome) values (emp_pub, 'T') returning id into tip;
  insert into public.comodos (tipologia_id, nome, geometria) values (tip, 'Sala', '{}') returning id into com;
  insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar) values (emp_pub, tip, 1, '101', 1) returning id into uni;
  insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values (emp_arq, 1, '101', 1) returning id into uni_arq;
  insert into public.midias (empreendimento_id, unidade_id, comodo_id, caminho_storage) values (emp_pub, uni, com, 'a/f.webp') returning id into mid;
  insert into public.hotspots (comodo_id, titulo, posicao, midia_id) values (com, 'Piso', '{"x":0,"y":0,"z":0}', mid);

  -- C: só rascunho e arquivado
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (c, 'Rasc C', 'teste-rasc-' || left(c::text, 8), 3, 2) returning id into emp_c_rasc;
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (c, 'Arq C', 'teste-arqc-' || left(c::text, 8), 3, 2, 'arquivado') returning id into emp_c_arq;

  -- ===== Visitante =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  select count(*) into n from public.empreendimentos where id = emp_arq;
  r := r || format(E'\n[%s] visitante NÃO vê empreendimento arquivado', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.unidades where empreendimento_id = emp_arq;
  r := r || format(E'\n[%s] visitante NÃO vê unidades de empreendimento arquivado', case when n = 0 then 'OK' else 'FALHOU' end);

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd) values (emp_arq, 'X', '11999990000', true);
    r := r || E'\n[FALHOU] lead em empreendimento arquivado foi aceito';
  exception when insufficient_privilege then
    r := r || E'\n[OK] lead em empreendimento arquivado é recusado';
  end;

  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo) values (emp_arq, 'sessao_teste_123', 'abriu_tour');
    r := r || E'\n[FALHOU] evento em empreendimento arquivado foi aceito';
  exception when insufficient_privilege then
    r := r || E'\n[OK] evento em empreendimento arquivado é recusado';
  end;

  select count(*) into n from public.perfis where id = c;
  r := r || format(E'\n[%s] visitante NÃO vê o perfil de quem só tem rascunho/arquivado', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.perfis where id = a;
  r := r || format(E'\n[%s] visitante vê o perfil de quem tem publicado', case when n = 1 then 'OK' else 'FALHOU' end);

  -- Lead e evento no publicado de A (para testar a cascata da exclusão)
  insert into public.leads (empreendimento_id, unidade_id, nome, telefone, consentimento_lgpd) values (emp_pub, uni, 'Maria', '11999990000', true);
  insert into public.eventos (empreendimento_id, unidade_id, comodo_id, sessao_id, tipo) values (emp_pub, uni, com, 'sessao_teste_123', 'viu_comodo');

  -- ===== Arquivar tira do ar na hora =====
  -- Controle positivo: ANTES de arquivar, o visitante vê o empreendimento e a unidade.
  select count(*) into n from public.empreendimentos where id = emp_pub;
  r := r || format(E'\n[%s] antes de arquivar, visitante vê o empreendimento publicado', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.unidades where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] antes de arquivar, visitante vê a unidade publicada', case when n = 1 then 'OK' else 'FALHOU' end);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  update public.empreendimentos set status = 'arquivado' where id = emp_pub;
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  select count(*) into n from public.empreendimentos where id = emp_pub;
  r := r || format(E'\n[%s] arquivar tira o empreendimento do ar na hora', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.unidades where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] ... e as unidades dele', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.perfis where id = a;
  r := r || format(E'\n[%s] sem nada publicado, o perfil de A também some para o visitante', case when n = 0 then 'OK' else 'FALHOU' end);

  -- ===== Excluir a conta de A apaga tudo dela em cascata =====
  perform set_config('role', 'none', true);  -- volta ao papel da sessão (como o Supabase Auth)
  delete from auth.users where id = a;

  select count(*) into n from public.perfis where id = a;
  r := r || format(E'\n[%s] excluir a conta apaga o perfil', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.empreendimentos where id in (emp_pub, emp_arq);
  r := r || format(E'\n[%s] excluir a conta apaga os empreendimentos', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.tipologias where id = tip;
  r := r || format(E'\n[%s] ... e as tipologias', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.comodos where id = com;
  r := r || format(E'\n[%s] ... e os cômodos', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.unidades where id in (uni, uni_arq);
  r := r || format(E'\n[%s] ... e as unidades', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.midias where id = mid;
  r := r || format(E'\n[%s] ... e as mídias', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.hotspots where comodo_id = com;
  r := r || format(E'\n[%s] ... e os hotspots', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.leads where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] ... e os leads (dados pessoais não ficam órfãos)', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.eventos where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] ... e os eventos', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.empreendimentos where dono_id = c;
  r := r || format(E'\n[%s] excluir A não afeta os dados de C', case when n = 2 then 'OK' else 'FALHOU' end);

  raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM',
    (length(r) - length(replace(r, E'\n[', ''))) / 2,
    (length(r) - length(replace(r, '[OK]', ''))) / 4,
    coalesce((select string_agg(l, ' | ') from regexp_split_to_table(r, E'\n') as l where l like '[FALHOU]%'), '');
end
$$;
