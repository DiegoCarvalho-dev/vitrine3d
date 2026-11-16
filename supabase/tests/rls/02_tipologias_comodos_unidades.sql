-- Teste de RLS da issue #14 (tipologias, cômodos e unidades). Roda numa transação
-- DESFEITA no fim (raise exception), então não deixa dados. Uso:
--   supabase db query --remote --yes -f supabase/tests/rls/02_tipologias_comodos_unidades.sql
-- Todas as linhas do relatório devem ser [OK].
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  emp_pub uuid;   -- empreendimento publicado de A
  emp_rasc uuid;  -- empreendimento rascunho de A
  emp_b uuid;     -- empreendimento de B
  tip_a uuid;
  tip_rasc uuid;
  tip_b uuid;
  uni_oculta uuid;
  uni_visivel uuid;
  n int;
  v numeric;
  r text := '';
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'teste-a-' || a || '@exemplo.test', '{}', now(), now()),
    (b, 'authenticated', 'authenticated', 'teste-b-' || b || '@exemplo.test', '{}', now(), now());

  -- ===== Corretor A monta dois empreendimentos =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
  values (a, 'Pub A', 'teste-pub-' || left(a::text, 8), 10, 4, 'publicado') returning id into emp_pub;
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (a, 'Rasc A', 'teste-rasc-' || left(a::text, 8), 10, 4) returning id into emp_rasc;

  insert into public.tipologias (empreendimento_id, nome, quartos, area_privativa_m2)
  values (emp_pub, 'Tipo A', 2, 65) returning id into tip_a;
  insert into public.tipologias (empreendimento_id, nome) values (emp_rasc, 'Tipo R') returning id into tip_rasc;
  insert into public.comodos (tipologia_id, nome, tipo, geometria)
  values (tip_a, 'Sala', 'sala', '{"tipo":"poligono","pontos":[[0,0],[4,0],[4,3],[0,3]],"pe_direito":2.7}');
  insert into public.comodos (tipologia_id, nome, geometria) values (tip_rasc, 'Sala R', '{"tipo":"poligono","pontos":[]}');

  insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar, preco, observacoes)
  values (emp_pub, tip_a, 9, '902', 2, 500000, 'cliente X negociando')
  returning id into uni_oculta;
  insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco)
  values (emp_pub, tip_a, 9, '903', 3, 520000, true)
  returning id into uni_visivel;
  r := r || E'\n[OK] A cria tipologias, cômodos e unidades';

  select exibir_preco::int into n from public.unidades where id = uni_oculta;
  r := r || format(E'\n[%s] unidade nova nasce "sob consulta" (exibir_preco = false)', case when n = 0 then 'OK' else 'FALHOU' end);

  begin
    insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar)
    values (emp_pub, 1, '902', 1);
    r := r || E'\n[FALHOU] aceitou unidade com número repetido';
  exception when unique_violation then
    r := r || E'\n[OK] número de unidade repetido é recusado';
  end;

  begin
    insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar)
    values (emp_pub, 9, '999', 2);
    r := r || E'\n[FALHOU] aceitou duas unidades na mesma posição do andar';
  exception when unique_violation then
    r := r || E'\n[OK] mesma posição no mesmo andar é recusada';
  end;

  begin
    insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar)
    values (emp_pub, tip_rasc, 1, '101', 1);
    r := r || E'\n[FALHOU] aceitou tipologia de outro empreendimento';
  exception when foreign_key_violation then
    r := r || E'\n[OK] tipologia de outro empreendimento é recusada (FK composta)';
  end;

  begin
    update public.unidades set preco_publico = 1 where id = uni_oculta;
    r := r || E'\n[FALHOU] alterou preco_publico direto';
  exception when insufficient_privilege or generated_always then
    r := r || E'\n[OK] preco_publico não pode ser escrito (coluna gerada)';
  end;

  -- ===== Corretor B (concorrente logado) =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (b, 'Emp B', 'teste-b-' || left(b::text, 8), 5, 2) returning id into emp_b;

  select count(*) into n from public.unidades where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] concorrente logado NÃO lê unidades de A (nem o preço oculto) (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  select count(*) into n from public.tipologias where id = tip_a;
  r := r || format(E'\n[%s] concorrente lê tipologia publicada de A (sem dado sensível)', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.tipologias where id = tip_rasc;
  r := r || format(E'\n[%s] concorrente NÃO lê tipologia de rascunho de A', case when n = 0 then 'OK' else 'FALHOU' end);

  begin
    insert into public.tipologias (empreendimento_id, nome) values (emp_pub, 'Invasora');
    r := r || E'\n[FALHOU] B criou tipologia no empreendimento de A';
  exception when insufficient_privilege then
    r := r || E'\n[OK] B NÃO cria tipologia no empreendimento de A';
  end;

  begin
    insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar)
    values (emp_pub, 1, '101', 1);
    r := r || E'\n[FALHOU] B criou unidade no empreendimento de A';
  exception when insufficient_privilege then
    r := r || E'\n[OK] B NÃO cria unidade no empreendimento de A';
  end;

  insert into public.tipologias (empreendimento_id, nome) values (emp_b, 'Tipo B') returning id into tip_b;
  begin
    insert into public.comodos (tipologia_id, nome, geometria) values (tip_a, 'Invasor', '{}');
    r := r || E'\n[FALHOU] B criou cômodo na tipologia de A';
  exception when insufficient_privilege then
    r := r || E'\n[OK] B NÃO cria cômodo na tipologia de A';
  end;

  update public.unidades set status = 'vendido' where id = uni_visivel;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] B NÃO altera unidade de A (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- ===== Visitante anônimo =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  begin
    perform preco from public.unidades where id = uni_oculta;
    r := r || E'\n[FALHOU] visitante leu a coluna preco';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO lê a coluna preco (GRANT por coluna)';
  end;

  begin
    perform observacoes from public.unidades where id = uni_oculta;
    r := r || E'\n[FALHOU] visitante leu observacoes';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO lê observacoes (nota interna)';
  end;

  select preco_publico into v from public.unidades where id = uni_oculta;
  r := r || format(E'\n[%s] "sob consulta": preco_publico = null para o visitante', case when v is null then 'OK' else 'FALHOU' end);
  select preco_publico into v from public.unidades where id = uni_visivel;
  r := r || format(E'\n[%s] preço visível: preco_publico = 520000 (%s)', case when v = 520000 then 'OK' else 'FALHOU' end, v);

  select count(*) into n from public.unidades where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] visitante vê as 2 unidades publicadas', case when n = 2 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.tipologias where id = tip_rasc;
  r := r || format(E'\n[%s] visitante NÃO vê tipologia de rascunho', case when n = 0 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.comodos c join public.tipologias t on t.id = c.tipologia_id where t.empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] visitante vê cômodos do publicado', case when n = 1 then 'OK' else 'FALHOU' end);
  select count(*) into n from public.comodos where tipologia_id = tip_rasc;
  r := r || format(E'\n[%s] visitante NÃO vê cômodos do rascunho', case when n = 0 then 'OK' else 'FALHOU' end);

  begin
    insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values (emp_pub, 1, '102', 2);
    r := r || E'\n[FALHOU] visitante criou unidade';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO cria unidade';
  end;

  -- ===== Volta para A: apagar tipologia e empreendimento =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  delete from public.tipologias where id = tip_a;
  select count(*) into n from public.unidades where id in (uni_oculta, uni_visivel) and tipologia_id is null;
  r := r || format(E'\n[%s] apagar a tipologia deixa as unidades sem tipologia (não as apaga)', case when n = 2 then 'OK' else 'FALHOU' end);

  delete from public.empreendimentos where id = emp_pub;
  select count(*) into n from public.unidades where empreendimento_id = emp_pub;
  r := r || format(E'\n[%s] apagar o empreendimento apaga as unidades (cascata)', case when n = 0 then 'OK' else 'FALHOU' end);

  -- Desfaz TUDO e devolve um RESUMO curto (a CLI corta mensagens longas, ~1000
  -- caracteres): total de cenários, quantos OK e só a descrição dos que falharam.
  -- FIM confirma que a mensagem não foi cortada.
  raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM',
    (length(r) - length(replace(r, E'\n[', ''))) / 2,
    (length(r) - length(replace(r, '[OK]', ''))) / 4,
    coalesce((select string_agg(l, ' | ') from regexp_split_to_table(r, E'\n') as l where l like '[FALHOU]%'), '');
end
$$;
