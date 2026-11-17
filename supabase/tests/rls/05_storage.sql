-- Teste do Storage (issue #27): quem pode enviar arquivos para o bucket midias.
-- Roda numa transação DESFEITA no fim. Os "arquivos" são só linhas em
-- storage.objects (o mesmo que o Storage grava), então nada vai para o disco.
-- Uso: npm run test:rls
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  emp_a uuid;
  emp_b uuid;
  n int;
  r text := '';
  arquivo text := gen_random_uuid() || '.webp';
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values
    (a, 'authenticated', 'authenticated', 'teste-a-' || a || '@exemplo.test', '{}', now(), now()),
    (b, 'authenticated', 'authenticated', 'teste-b-' || b || '@exemplo.test', '{}', now(), now());

  -- Configuração do bucket
  select count(*) into n from storage.buckets
  where id = 'midias' and public and file_size_limit = 2097152
    and allowed_mime_types @> array['image/webp', 'image/jpeg', 'image/png']
    and array_length(allowed_mime_types, 1) = 3;
  r := r || format(E'\n[%s] bucket midias: público, 2 MB, só webp/jpeg/png', case when n = 1 then 'OK' else 'FALHOU' end);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (b, 'Emp B', 'teste-b-' || left(b::text, 8), 3, 2) returning id into emp_b;

  -- ===== Corretor A =====
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar)
  values (a, 'Emp A', 'teste-a-' || left(a::text, 8), 3, 2) returning id into emp_a;

  insert into storage.objects (bucket_id, name) values ('midias', a || '/' || emp_a || '/' || arquivo);
  r := r || E'\n[OK] A envia imagem para o próprio empreendimento';
  insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/' || arquivo);
  r := r || E'\n[OK] A envia foto para a própria pasta de perfil';

  begin
    insert into storage.objects (bucket_id, name) values ('midias', b || '/perfil/' || gen_random_uuid() || '.webp');
    r := r || E'\n[FALHOU] A enviou para a pasta de B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO envia para a pasta de B';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/' || emp_b || '/' || gen_random_uuid() || '.webp');
    r := r || E'\n[FALHOU] A enviou para o empreendimento de B (na própria pasta)';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO envia para o empreendimento de B';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/' || gen_random_uuid() || '.html');
    r := r || E'\n[FALHOU] aceitou extensão .html';
  exception when insufficient_privilege then
    r := r || E'\n[OK] extensão .html é recusada';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/' || gen_random_uuid() || '.svg');
    r := r || E'\n[FALHOU] aceitou extensão .svg (pode conter script)';
  exception when insufficient_privilege then
    r := r || E'\n[OK] extensão .svg é recusada';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/sub/' || gen_random_uuid() || '.webp');
    r := r || E'\n[FALHOU] aceitou subpasta fora do formato';
  exception when insufficient_privilege then
    r := r || E'\n[OK] subpasta fora do formato é recusada';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/../' || b || '/' || gen_random_uuid() || '.webp');
    r := r || E'\n[FALHOU] aceitou caminho com ..';
  exception when insufficient_privilege then
    r := r || E'\n[OK] caminho com .. é recusado';
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/foto-da-ana.webp');
    r := r || E'\n[FALHOU] aceitou nome de arquivo adivinhável';
  exception when insufficient_privilege then
    r := r || E'\n[OK] nome de arquivo precisa ser UUID (não adivinhável)';
  end;

  begin
    update storage.objects set name = b || '/perfil/' || arquivo where name = a || '/perfil/' || arquivo;
    r := r || E'\n[FALHOU] A moveu o arquivo para a pasta de B';
  exception when insufficient_privilege then
    r := r || E'\n[OK] A NÃO move arquivo para a pasta de B';
  end;

  select count(*) into n from storage.objects where bucket_id = 'midias' and split_part(name, '/', 1) = a::text;
  r := r || format(E'\n[%s] A lista os próprios arquivos (%s)', case when n = 2 then 'OK' else 'FALHOU' end, n);

  -- ===== Corretor B =====
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'midias' and split_part(name, '/', 1) = a::text;
  r := r || format(E'\n[%s] B NÃO lista os arquivos de A (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);
  update storage.objects set metadata = '{}' where bucket_id = 'midias' and split_part(name, '/', 1) = a::text;
  get diagnostics n = row_count;
  r := r || format(E'\n[%s] B NÃO altera os arquivos de A (%s linhas)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  -- ===== Visitante =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  begin
    insert into storage.objects (bucket_id, name) values ('midias', a || '/perfil/' || gen_random_uuid() || '.webp');
    r := r || E'\n[FALHOU] visitante enviou arquivo';
  exception when insufficient_privilege then
    r := r || E'\n[OK] visitante NÃO envia arquivos';
  end;
  select count(*) into n from storage.objects where bucket_id = 'midias';
  r := r || format(E'\n[%s] visitante NÃO lista arquivos pela API (%s)', case when n = 0 then 'OK' else 'FALHOU' end, n);

  raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM',
    (length(r) - length(replace(r, E'\n[', ''))) / 2,
    (length(r) - length(replace(r, '[OK]', ''))) / 4,
    coalesce((select string_agg(l, ' | ') from regexp_split_to_table(r, E'\n') as l where l like '[FALHOU]%'), '');
end
$$;
