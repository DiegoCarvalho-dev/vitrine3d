-- Teste de RLS da issue #15 (mídias, hotspots, leads e eventos). Roda numa
-- transação DESFEITA no fim, então não deixa dados. Uso: npm run test:rls
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  emp_pub uuid;
  emp_rasc uuid;
  emp_b uuid;
  tip uuid;
  com uuid;
  com_b uuid;
  uni uuid;
  uni_b uuid;
  mid uuid;
  mid_b uuid;
  n int;
  i int;
  r text := '';
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'teste-a-' || a || '@exemplo.test', '{}', now(), now()),
    (b, 'authenticated', 'authenticated', 'teste-b-' || b || '@exemplo.test', '{}', now(), now());

  -- ===== Montagem: A (publicado + rascunho) e B =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (b, 'Emp B', 'teste-b-' || left(b::text, 8), 5, 2, 'publicado') returning id into emp_b;
  insert into public.tipologias (empreendimento_id, nome) values (emp_b, 'T B') returning id into tip;
  insert into public.comodos (tipologia_id, nome, geometria) values (tip, 'Sala B', '{}') returning id into com_b;
  insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values (emp_b, 1, '101', 1) returning id into uni_b;
  insert into public.midias (empreendimento_id, caminho_storage) values (emp_b, 'b/foto.webp') returning id into mid_b;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (a, 'Pub A', 'teste-pub-' || left(a::text, 8), 10, 4, 'publicado') returning id into emp_pub;
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (a, 'Rasc A', 'teste-rasc-' || left(a::text, 8), 10, 4) returning id into emp_rasc;
  insert into public.tipologias (empreendimento_id, nome) values (emp_pub, 'T A') returning id into tip;
  insert into public.comodos (tipologia_id, nome, geometria) values (tip, 'Sala A', '{}') returning id into com;
  insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values (emp_pub, 9, '902', 2) returning id into uni;

  -- ===== Mídias e hotspots (dono A) =====
  insert into public.midias (empreendimento_id, unidade_id, comodo_id, caminho_storage)
  values (emp_pub, uni, com, 'a/foto.webp') returning id into mid;
  r := r || E'\n[OK] A cria mídia ligada à própria unidade e cômodo';

  begin
    insert into public.midias (empreendimento_id, unidade_id, caminho_storage) values (emp_pub, uni_b, 'x.webp');
    r := r || E'\n[FALHOU] mídia aceitou unidade de outro empreendimento';
  exception when foreign_key_violation then
    r := r || E'\n[OK] mídia NÃO aceita unidade de outro empreendimento (FK composta)';
  end;

  begin
    insert into public.midias (empreendimento_id, comodo_id, caminho_storage) values (emp_pub, com_b, 'x.webp');
    r := r || E'\n[FALHOU] mídia aceitou cômodo de outro empreendimento';
  exception when insufficient_privilege then
    r := r || E'\n[OK] mídia NÃO aceita cômodo de outro empreendimento (policy)';
  end;

  begin
    insert into public.midias (empreendimento_id, caminho_storage) values (emp_b, 'invasora.webp');
    r := r || E'\n[FALHOU] A criou mídia no empreendimento de B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO cria mídia no empreendimento de B';
  end;

  insert into public.hotspots (comodo_id, titulo, posicao, midia_id)
  values (com, 'Piso porcelanato', '{"x":1,"y":1.6,"z":0.5}', mid);
  r := r || E'\n[OK] A cria hotspot com mídia do mesmo empreendimento';

  begin
    insert into public.hotspots (comodo_id, titulo, posicao, midia_id) values (com, 'X', '{"x":0,"y":0,"z":0}', mid_b);
    r := r || E'\n[FALHOU] hotspot aceitou mídia de outro empreendimento';
  exception when insufficient_privilege then
    r := r || E'\n[OK] hotspot NÃO aceita mídia de outro empreendimento';
  end;

  begin
    insert into public.hotspots (comodo_id, titulo, posicao) values (com_b, 'Invasor', '{"x":0,"y":0,"z":0}');
    r := r || E'\n[FALHOU] A criou hotspot no cômodo de B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO cria hotspot no cômodo de B';
  end;

  -- ===== Visitante: não grava nada direto (#84) =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  begin
    insert into public.leads (empreendimento_id, unidade_id, nome, telefone, consentimento_lgpd)
    values (emp_pub, uni, 'Direto', '+5511988887777', true);
    r := r || E'\n[FALHOU] visitante inseriu lead direto pela API';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO insere lead direto pela API (só o servidor grava)';
  end;
  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo) values (emp_pub, 'sessao_direta_84', 'abriu_tour');
    r := r || E'\n[FALHOU] visitante inseriu evento direto pela API';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO insere evento direto pela API (só o servidor grava)';
  end;
  begin
    perform 1 from public.leads;
    r := r || E'\n[FALHOU] visitante leu leads';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO lê leads';
  end;
  begin
    perform public.registrar_envio('lead', repeat('a', 32), 1, 60);
    r := r || E'\n[FALHOU] visitante chamou registrar_envio';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO chama registrar_envio (limite por IP é do servidor)';
  end;

  -- ===== Servidor (service_role): grava leads, com as travas do banco =====
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

  insert into public.leads (empreendimento_id, unidade_id, nome, telefone, consentimento_lgpd)
  values (emp_pub, uni, 'Maria', '+5511988887777', true);
  r := r || E'\n[OK] servidor grava lead com consentimento (empreendimento publicado)';

  -- Limite por IP (registrar_envio): 2 cabem, o 3º na mesma janela não.
  r := r || format(E'\n[%s] limite por IP: dentro do limite passa',
    case when public.registrar_envio('lead', repeat('b', 32), 2, 600)
           and public.registrar_envio('lead', repeat('b', 32), 2, 600) then 'OK' else 'FALHOU' end);
  r := r || format(E'\n[%s] limite por IP: acima do limite é recusado',
    case when not public.registrar_envio('lead', repeat('b', 32), 2, 600) then 'OK' else 'FALHOU' end);
  r := r || format(E'\n[%s] limite por IP: chave fora do formato é recusada',
    case when not public.registrar_envio('lead', '1.2.3.4', 5, 600) then 'OK' else 'FALHOU' end);

  -- Lead com a sessão do tour (#69) e limite de 5 por sessão em 10 minutos
  -- (no empreendimento de B, para não mexer nas contas de A abaixo).
  for i in 1..5 loop
    insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd, sessao_id)
    values (emp_b, 'Sessão ' || i, 'pessoa' || i || '@exemplo.test', true, 'sessao_lead_69');
  end loop;
  r := r || E'\n[OK] servidor grava lead com sessao_id';
  begin
    insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd, sessao_id)
    values (emp_b, 'Sexto', 'sexto@exemplo.test', true, 'sessao_lead_69');
    r := r || E'\n[FALHOU] 6º lead da sessão em 10 minutos foi aceito';
  exception when sqlstate 'PT429' then
    r := r || E'\n[OK] 6º lead da sessão em 10 minutos é recusado';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd) values (emp_pub, 'Sem consentimento', '11999990000', false);
    r := r || E'\n[FALHOU] lead sem consentimento foi aceito';
  exception when insufficient_privilege or check_violation then
    r := r || E'\n[OK] lead sem consentimento é recusado';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, consentimento_lgpd) values (emp_pub, 'Sem contato', true);
    r := r || E'\n[FALHOU] lead sem telefone nem e-mail foi aceito';
  exception when check_violation then
    r := r || E'\n[OK] lead sem telefone nem e-mail é recusado';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd) values (emp_rasc, 'Rascunho', '11999990000', true);
    r := r || E'\n[FALHOU] lead em rascunho foi aceito';
  exception when sqlstate 'PT403' then
    r := r || E'\n[OK] lead em empreendimento em rascunho é recusado (trava do banco, mesmo para o servidor)';
  end;

  begin
    insert into public.leads (empreendimento_id, unidade_id, nome, telefone, consentimento_lgpd) values (emp_pub, uni_b, 'Cruzado', '11999990000', true);
    r := r || E'\n[FALHOU] lead aceitou unidade de outro empreendimento';
  exception when foreign_key_violation then
    r := r || E'\n[OK] lead NÃO aceita unidade de outro empreendimento';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd, status) values (emp_pub, 'Forja', '11999990000', true, 'ganho');
    r := r || E'\n[FALHOU] servidor escolheu o status do lead';
  exception when insufficient_privilege then
    r := r || E'\n[OK] servidor NÃO escolhe o status do lead (só colunas de dados)';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd, consentimento_em) values (emp_pub, 'Forja', '11999990000', true, now() - interval '1 year');
    r := r || E'\n[FALHOU] servidor forjou a data do consentimento';
  exception when insufficient_privilege then
    r := r || E'\n[OK] servidor NÃO forja a data do consentimento';
  end;

  begin
    insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd) values (emp_pub, repeat('x', 500), '11999990000', true);
    r := r || E'\n[FALHOU] nome gigante foi aceito';
  exception when check_violation then
    r := r || E'\n[OK] campos com tamanho máximo (nome de 500 caracteres recusado)';
  end;

  -- ===== Servidor: eventos =====
  insert into public.eventos (empreendimento_id, unidade_id, comodo_id, sessao_id, tipo, dados)
  values (emp_pub, uni, com, 'sessao_teste_123', 'viu_comodo', '{"segundos": 42}');
  r := r || E'\n[OK] servidor grava evento em empreendimento publicado';

  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo) values (emp_rasc, 'sessao_teste_123', 'abriu_tour');
    r := r || E'\n[FALHOU] evento em rascunho foi aceito';
  exception when sqlstate 'PT403' then
    r := r || E'\n[OK] evento em empreendimento em rascunho é recusado (trava do banco)';
  end;

  begin
    insert into public.eventos (empreendimento_id, comodo_id, sessao_id, tipo) values (emp_pub, com_b, 'sessao_teste_123', 'viu_comodo');
    r := r || E'\n[FALHOU] evento aceitou cômodo de outro empreendimento';
  exception when sqlstate 'PT403' then
    r := r || E'\n[OK] evento NÃO aceita cômodo de outro empreendimento (trava do banco)';
  end;

  -- Tipos novos (#67) e limite por sessão: 60 por minuto, o 61º é recusado.
  insert into public.eventos (empreendimento_id, unidade_id, sessao_id, tipo, dados)
  values (emp_pub, uni, 'sessao_limite_67', 'caminhou', '{}'),
         (emp_pub, null, 'sessao_limite_67', 'saiu', '{"segundos": 90}');
  r := r || E'\n[OK] eventos "caminhou" e "saiu" aceitos';
  for i in 1..58 loop
    insert into public.eventos (empreendimento_id, sessao_id, tipo)
    values (emp_pub, 'sessao_limite_67', 'abriu_tour');
  end loop;
  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo)
    values (emp_pub, 'sessao_limite_67', 'abriu_tour');
    r := r || E'\n[FALHOU] 61º evento da sessão no mesmo minuto foi aceito';
  exception when sqlstate 'PT429' then
    r := r || E'\n[OK] 61º evento da sessão no mesmo minuto é recusado';
  end;
  insert into public.eventos (empreendimento_id, sessao_id, tipo)
  values (emp_pub, 'outra_sessao_67', 'abriu_tour');
  r := r || E'\n[OK] outra sessão continua registrando';

  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo, dados) values (emp_pub, 'sessao_teste_123', 'abriu_tour', jsonb_build_object('lixo', repeat('x', 5000)));
    r := r || E'\n[FALHOU] evento com dados gigantes foi aceito';
  exception when check_violation then
    r := r || E'\n[OK] evento com dados gigantes é recusado';
  end;

  begin
    insert into public.eventos (empreendimento_id, sessao_id, tipo) values (emp_pub, 'x', 'abriu_tour');
    r := r || E'\n[FALHOU] sessao_id inválido foi aceito';
  exception when check_violation then
    r := r || E'\n[OK] sessao_id com formato inválido é recusado';
  end;

  -- ===== Visitante: não lê eventos; mídias e hotspots =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    perform 1 from public.eventos;
    r := r || E'\n[FALHOU] visitante leu eventos';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO lê eventos';
  end;
  select count(*) into n from public.midias where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] visitante vê mídias do publicado', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.hotspots where comodo_id = com;
  r := r || format(E'\n[%s] visitante vê hotspots do publicado', case when n = 1 then 'OK' else 'FALHOU' end);

  -- ===== Corretor B (concorrente) =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.leads where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] B NÃO vê leads de A (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);
  select count(*) into n from public.eventos where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] B NÃO vê eventos de A (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);
  update public.leads set status = 'perdido' where empreendimento_id = emp_pub;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] B NÃO altera leads de A (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- ===== Resumo de visitas (#72): cada corretor só vê os SEUS números =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from jsonb_array_elements(public.resumo_visitas(now() - interval '1 day', now() + interval '1 day')) x
    where x->>'empreendimento_id' = emp_pub::text;
  r := r || format(E'
[%s] B NÃO vê o resumo de visitas do empreendimento de A (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);
  select count(*) into n from jsonb_array_elements(public.resumo_visitas(now() - interval '1 day', now() + interval '1 day')) x
    where x->>'empreendimento_id' = emp_b::text;
  r := r || format(E'
[%s] B vê o resumo do PRÓPRIO empreendimento', case when n = 1 then 'OK' else 'FALHOU' end);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select (x->>'visitas')::int into n from jsonb_array_elements(public.resumo_visitas(now() - interval '1 day', now() + interval '1 day')) x
    where x->>'empreendimento_id' = emp_pub::text;
  -- sessões diferentes de A no teste: sessao_teste_123, sessao_limite_67, outra_sessao_67
  r := r || format(E'
[%s] A vê as visitas do próprio empreendimento (%s sessões)', case when n >= 3 then 'OK' else 'FALHOU' end, n);
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    perform public.resumo_visitas(now() - interval '1 day', now());
    r := r || E'
[FALHOU] visitante executou resumo_visitas';
  exception when insufficient_privilege then
    r := r || E'
[OK] visitante NÃO executa resumo_visitas';
  end;
  perform set_config('role', 'authenticated', true);

  -- ===== Corretor A (dono) =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.leads where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] A vê o lead recebido', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.leads where empreendimento_id = emp_pub and consentimento_em is not null and status = 'novo';
  r := r || format(E'\n[%s] banco registrou status "novo" e a hora do consentimento', case when n = 1 then 'OK' else 'FALHOU' end);
  update public.leads set status = 'em_contato' where empreendimento_id = emp_pub;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] A muda o status do lead', case when n = 1 then 'OK' else 'FALHOU' end);

  begin
    update public.leads set nome = 'editado' where empreendimento_id = emp_pub;
    r := r || E'\n[FALHOU] A alterou o nome do lead (dado do cliente)';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO altera os dados enviados pelo cliente (só o status)';
  end;

  -- 1 do começo + 2 tipos novos + 58 do teste de limite + 1 de outra sessão.
  select count(*) into n from public.eventos where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] A vê os eventos do próprio empreendimento', case when n = 62 then 'OK' else 'FALHOU' end);

  begin
    update public.eventos set tipo = 'enviou_lead' where empreendimento_id = emp_pub;
    r := r || E'\n[FALHOU] evento foi alterado';
  exception when insufficient_privilege then
    r := r || E'\n[OK] eventos são imutáveis (nem o dono altera)';
  end;

  -- Apagar a unidade não apaga o lead (só desliga a unidade).
  delete from public.unidades where id = uni;
  select count(*) into n from public.leads where empreendimento_id = emp_pub and unidade_id is null;
  r := r || format(E'\n[%s] apagar a unidade mantém o lead (unidade_id vira null)', case when n = 1 then 'OK' else 'FALHOU' end);

  raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM',
    (length(r) - length(replace(r, E'\n[', ''))) / 2,
    (length(r) - length(replace(r, '[OK]', ''))) / 4,
    coalesce((select string_agg(l, ' | ') from regexp_split_to_table(r, E'\n') as l where l like '[FALHOU]%'), '');
end
$$;
