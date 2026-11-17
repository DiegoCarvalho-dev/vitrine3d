-- GERADO por scripts/seed/gerar-seed.mjs a partir de supabase/seed/residencial-demo.json.
-- NÃO EDITE À MÃO: altere o JSON e rode `npm run db:seed:gerar`.
-- Prédio demo FICTÍCIO. Repetível: IDs fixos + on conflict do update; o que saiu do JSON é apagado.

-- Corretora demo (sem senha: não faz login; existe para ser dona do prédio demo).
-- Colunas de token preenchidas com '' (o Auth do Supabase não lida bem com null nelas).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '0d3e0000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'corretora.demo@exemplo.test', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"nome":"Corretora Demo"}'::jsonb, now(), now(), '', '', '', '')
on conflict (id) do update set email = excluded.email, raw_user_meta_data = excluded.raw_user_meta_data, updated_at = now();

-- O gatilho do cadastro já cria o perfil; aqui completamos os dados.
insert into public.perfis (id, nome, whatsapp, creci, cor_marca)
values ('0d3e0000-0000-4000-8000-000000000001', 'Corretora Demo', '+5511900000000', 'CRECI-SP 000000 (exemplo)', '#1b365d')
on conflict (id) do update set nome = excluded.nome, whatsapp = excluded.whatsapp, creci = excluded.creci, cor_marca = excluded.cor_marca;

insert into public.empreendimentos (id, dono_id, tipo, nome, slug, descricao, endereco, cidade, uf, latitude, longitude, numero_andares, unidades_por_andar, construtora, registro_incorporacao, previsao_entrega, informacoes_conferidas_em, status)
values ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000001', 'predio', 'Residencial Demo', 'residencial-demo', 'Empreendimento fictício para demonstração do Vitrine 3D: 10 andares, 4 apartamentos por andar, plantas de 2 e 3 quartos.', 'Rua Exemplo, 100', 'São Paulo', 'SP', -23.561, -46.656, 10, 4, 'Construtora Exemplo (fictícia)', 'R.1/000.000 (exemplo)', '2028-06-30', '2026-11-16', 'publicado')
on conflict (id) do update set dono_id = excluded.dono_id, tipo = excluded.tipo, nome = excluded.nome, slug = excluded.slug, descricao = excluded.descricao, endereco = excluded.endereco, cidade = excluded.cidade, uf = excluded.uf, latitude = excluded.latitude, longitude = excluded.longitude, numero_andares = excluded.numero_andares, unidades_por_andar = excluded.unidades_por_andar, construtora = excluded.construtora, registro_incorporacao = excluded.registro_incorporacao, previsao_entrega = excluded.previsao_entrega, informacoes_conferidas_em = excluded.informacoes_conferidas_em, status = excluded.status;

insert into public.tipologias (id, empreendimento_id, nome, quartos, suites, banheiros, vagas, area_privativa_m2, planta)
values
  ('0d3e0000-0000-4000-8000-000000000101', '0d3e0000-0000-4000-8000-000000000010', 'Tipo A', 2, 1, 2, 1, 80, '{"versao":1,"portas":[{"de":[0,3],"ate":[0,3.9]},{"de":[5,1.8],"ate":[5,2.8]},{"de":[6.6,3],"ate":[7.4,3]},{"de":[1.2,5],"ate":[3.2,5]},{"de":[6.1,5],"ate":[6.9,5]},{"de":[1.2,6],"ate":[2,6]},{"de":[6.1,6],"ate":[6.9,6]},{"de":[5,8],"ate":[5,8.8]}],"janelas":[{"de":[0.5,1.5],"ate":[4.5,1.5],"peitoril":0,"altura":2.2},{"de":[0.6,9.2],"ate":[2.6,9.2],"peitoril":1,"altura":1.2},{"de":[5.8,9.2],"ate":[7.4,9.2],"peitoril":1,"altura":1.2},{"de":[8,0.6],"ate":[8,1.8],"peitoril":1.1,"altura":1}]}'::jsonb),
  ('0d3e0000-0000-4000-8000-000000000102', '0d3e0000-0000-4000-8000-000000000010', 'Tipo B', 3, 1, 2, 2, 100, '{"versao":1,"portas":[{"de":[0,3],"ate":[0,3.9]},{"de":[6,2],"ate":[6,2.9]},{"de":[7.6,3],"ate":[8.4,3]},{"de":[1.5,5],"ate":[3.5,5]},{"de":[8.2,5],"ate":[9,5]},{"de":[1.1,6],"ate":[1.9,6]},{"de":[3.9,6],"ate":[4.7,6]},{"de":[8.1,6],"ate":[8.9,6]},{"de":[7,8],"ate":[7,8.8]}],"janelas":[{"de":[0.8,1.6],"ate":[5.2,1.6],"peitoril":0,"altura":2.2},{"de":[0.6,9.2],"ate":[2.4,9.2],"peitoril":1,"altura":1.2},{"de":[3.4,9.2],"ate":[5.2,9.2],"peitoril":1,"altura":1.2},{"de":[7.6,9.2],"ate":[9.4,9.2],"peitoril":1,"altura":1.2},{"de":[10,0.6],"ate":[10,1.8],"peitoril":1.1,"altura":1}]}'::jsonb)
on conflict (id) do update set nome = excluded.nome, quartos = excluded.quartos, suites = excluded.suites, banheiros = excluded.banheiros, vagas = excluded.vagas, area_privativa_m2 = excluded.area_privativa_m2, planta = excluded.planta;

insert into public.comodos (id, tipologia_id, nome, tipo, descricao, area_m2, geometria, ordem)
values
  ('0d3e0000-0000-4000-8000-000000010101', '0d3e0000-0000-4000-8000-000000000101', 'Varanda', 'varanda', 'Varanda com guarda-corpo de vidro, vista para a rua arborizada.', 7.5, '{"tipo":"poligono","pontos":[[0,0],[5,0],[5,1.5],[0,1.5]],"pe_direito":2.7}'::jsonb, 1),
  ('0d3e0000-0000-4000-8000-000000010102', '0d3e0000-0000-4000-8000-000000000101', 'Sala de estar e jantar', 'sala', 'Sala integrada com porta de correr para a varanda e piso porcelanato.', 17.5, '{"tipo":"poligono","pontos":[[0,1.5],[5,1.5],[5,5],[0,5]],"pe_direito":2.7}'::jsonb, 2),
  ('0d3e0000-0000-4000-8000-000000010103', '0d3e0000-0000-4000-8000-000000000101', 'Cozinha', 'cozinha', 'Cozinha americana aberta para a sala, com bancada em granito.', 9, '{"tipo":"poligono","pontos":[[5,0],[8,0],[8,3],[5,3]],"pe_direito":2.7}'::jsonb, 3),
  ('0d3e0000-0000-4000-8000-000000010104', '0d3e0000-0000-4000-8000-000000000101', 'Área de serviço', 'lavanderia', 'Espaço para máquina de lavar e tanque, com acesso pela cozinha.', 3.6, '{"tipo":"poligono","pontos":[[5,3],[8,3],[8,4.2],[5,4.2]],"pe_direito":2.7}'::jsonb, 4),
  ('0d3e0000-0000-4000-8000-000000010105', '0d3e0000-0000-4000-8000-000000000101', 'Banheiro social', 'banheiro', 'Banheiro com box de vidro, acesso pelo corredor.', 2.4, '{"tipo":"poligono","pontos":[[5,4.2],[8,4.2],[8,5],[5,5]],"pe_direito":2.5}'::jsonb, 5),
  ('0d3e0000-0000-4000-8000-000000010106', '0d3e0000-0000-4000-8000-000000000101', 'Circulação', 'outro', 'Corredor que liga a sala aos quartos e aos banheiros.', 8, '{"tipo":"poligono","pontos":[[0,5],[8,5],[8,6],[0,6]],"pe_direito":2.7}'::jsonb, 6),
  ('0d3e0000-0000-4000-8000-000000010107', '0d3e0000-0000-4000-8000-000000000101', 'Quarto', 'quarto', 'Quarto com janela ampla, ideal para crianças ou escritório.', 10.24, '{"tipo":"poligono","pontos":[[0,6],[3.2,6],[3.2,9.2],[0,9.2]],"pe_direito":2.7}'::jsonb, 7),
  ('0d3e0000-0000-4000-8000-000000010108', '0d3e0000-0000-4000-8000-000000000101', 'Banheiro da suíte', 'banheiro', 'Banheiro privativo, com acesso só pela suíte.', 5.76, '{"tipo":"poligono","pontos":[[3.2,6],[5,6],[5,9.2],[3.2,9.2]],"pe_direito":2.5}'::jsonb, 8),
  ('0d3e0000-0000-4000-8000-000000010109', '0d3e0000-0000-4000-8000-000000000101', 'Suíte', 'suite', 'Suíte com espaço para cama de casal e armário.', 9.6, '{"tipo":"poligono","pontos":[[5,6],[8,6],[8,9.2],[5,9.2]],"pe_direito":2.7}'::jsonb, 9),
  ('0d3e0000-0000-4000-8000-000000010201', '0d3e0000-0000-4000-8000-000000000102', 'Varanda gourmet', 'varanda', 'Varanda gourmet com ponto para churrasqueira elétrica.', 9.6, '{"tipo":"poligono","pontos":[[0,0],[6,0],[6,1.6],[0,1.6]],"pe_direito":2.7}'::jsonb, 1),
  ('0d3e0000-0000-4000-8000-000000010202', '0d3e0000-0000-4000-8000-000000000102', 'Sala de estar e jantar', 'sala', 'Sala ampla integrada à varanda gourmet.', 20.4, '{"tipo":"poligono","pontos":[[0,1.6],[6,1.6],[6,5],[0,5]],"pe_direito":2.7}'::jsonb, 2),
  ('0d3e0000-0000-4000-8000-000000010203', '0d3e0000-0000-4000-8000-000000000102', 'Cozinha', 'cozinha', 'Cozinha com espaço para mesa de apoio.', 12, '{"tipo":"poligono","pontos":[[6,0],[10,0],[10,3],[6,3]],"pe_direito":2.7}'::jsonb, 3),
  ('0d3e0000-0000-4000-8000-000000010204', '0d3e0000-0000-4000-8000-000000000102', 'Área de serviço', 'lavanderia', 'Lavanderia separada, com acesso pela cozinha.', 4.8, '{"tipo":"poligono","pontos":[[6,3],[10,3],[10,4.2],[6,4.2]],"pe_direito":2.7}'::jsonb, 4),
  ('0d3e0000-0000-4000-8000-000000010205', '0d3e0000-0000-4000-8000-000000000102', 'Banheiro social', 'banheiro', 'Banheiro social com bancada dupla, acesso pelo corredor.', 3.2, '{"tipo":"poligono","pontos":[[6,4.2],[10,4.2],[10,5],[6,5]],"pe_direito":2.5}'::jsonb, 5),
  ('0d3e0000-0000-4000-8000-000000010206', '0d3e0000-0000-4000-8000-000000000102', 'Circulação', 'outro', 'Corredor que liga a sala aos quartos e aos banheiros.', 10, '{"tipo":"poligono","pontos":[[0,5],[10,5],[10,6],[0,6]],"pe_direito":2.7}'::jsonb, 6),
  ('0d3e0000-0000-4000-8000-000000010207', '0d3e0000-0000-4000-8000-000000000102', 'Quarto 2', 'quarto', 'Quarto com janela para o fundo, mais silencioso.', 9.6, '{"tipo":"poligono","pontos":[[0,6],[3,6],[3,9.2],[0,9.2]],"pe_direito":2.7}'::jsonb, 7),
  ('0d3e0000-0000-4000-8000-000000010208', '0d3e0000-0000-4000-8000-000000000102', 'Quarto 3', 'quarto', 'Quarto que também funciona como escritório.', 8.32, '{"tipo":"poligono","pontos":[[3,6],[5.6,6],[5.6,9.2],[3,9.2]],"pe_direito":2.7}'::jsonb, 8),
  ('0d3e0000-0000-4000-8000-000000010209', '0d3e0000-0000-4000-8000-000000000102', 'Banheiro da suíte', 'banheiro', 'Banheiro da suíte, com acesso só pela suíte.', 4.48, '{"tipo":"poligono","pontos":[[5.6,6],[7,6],[7,9.2],[5.6,9.2]],"pe_direito":2.5}'::jsonb, 9),
  ('0d3e0000-0000-4000-8000-000000010210', '0d3e0000-0000-4000-8000-000000000102', 'Suíte', 'suite', 'Suíte master com closet.', 9.6, '{"tipo":"poligono","pontos":[[7,6],[10,6],[10,9.2],[7,9.2]],"pe_direito":2.7}'::jsonb, 10)
on conflict (id) do update set tipologia_id = excluded.tipologia_id, nome = excluded.nome, tipo = excluded.tipo, descricao = excluded.descricao, area_m2 = excluded.area_m2, geometria = excluded.geometria, ordem = excluded.ordem;

insert into public.unidades (empreendimento_id, tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco, status)
values
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 1, '101', 1, 690000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 1, '102', 2, 520000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 1, '103', 3, 520000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 1, '104', 4, 690000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 2, '201', 1, 698000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 2, '202', 2, 526000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 2, '203', 3, 526000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 2, '204', 4, 698000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 3, '301', 1, 707000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 3, '302', 2, 532000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 3, '303', 3, 532000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 3, '304', 4, 707000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 4, '401', 1, 715000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 4, '402', 2, 539000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 4, '403', 3, 539000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 4, '404', 4, 715000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 5, '501', 1, 723000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 5, '502', 2, 545000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 5, '503', 3, 545000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 5, '504', 4, 723000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 6, '601', 1, 731000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 6, '602', 2, 551000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 6, '603', 3, 551000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 6, '604', 4, 731000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 7, '701', 1, 740000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 7, '702', 2, 557000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 7, '703', 3, 557000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 7, '704', 4, 740000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 8, '801', 1, 748000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 8, '802', 2, 564000, true, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 8, '803', 3, 564000, true, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 8, '804', 4, 748000, true, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 9, '901', 1, 756000, false, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 9, '902', 2, 570000, false, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 9, '903', 3, 570000, false, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 9, '904', 4, 756000, false, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 10, '1001', 1, 765000, false, 'disponivel'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 10, '1002', 2, 576000, false, 'reservado'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000101', 10, '1003', 3, 576000, false, 'vendido'),
  ('0d3e0000-0000-4000-8000-000000000010', '0d3e0000-0000-4000-8000-000000000102', 10, '1004', 4, 765000, false, 'disponivel')
on conflict (empreendimento_id, numero) do update set tipologia_id = excluded.tipologia_id, andar = excluded.andar, posicao_no_andar = excluded.posicao_no_andar, preco = excluded.preco, exibir_preco = excluded.exibir_preco, status = excluded.status;

-- Remove do prédio demo o que saiu do JSON (só linhas do demo).
delete from public.comodos where tipologia_id in ('0d3e0000-0000-4000-8000-000000000101', '0d3e0000-0000-4000-8000-000000000102') and id not in ('0d3e0000-0000-4000-8000-000000010101', '0d3e0000-0000-4000-8000-000000010102', '0d3e0000-0000-4000-8000-000000010103', '0d3e0000-0000-4000-8000-000000010104', '0d3e0000-0000-4000-8000-000000010105', '0d3e0000-0000-4000-8000-000000010106', '0d3e0000-0000-4000-8000-000000010107', '0d3e0000-0000-4000-8000-000000010108', '0d3e0000-0000-4000-8000-000000010109', '0d3e0000-0000-4000-8000-000000010201', '0d3e0000-0000-4000-8000-000000010202', '0d3e0000-0000-4000-8000-000000010203', '0d3e0000-0000-4000-8000-000000010204', '0d3e0000-0000-4000-8000-000000010205', '0d3e0000-0000-4000-8000-000000010206', '0d3e0000-0000-4000-8000-000000010207', '0d3e0000-0000-4000-8000-000000010208', '0d3e0000-0000-4000-8000-000000010209', '0d3e0000-0000-4000-8000-000000010210');
delete from public.unidades where empreendimento_id = '0d3e0000-0000-4000-8000-000000000010' and numero not in ('101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303', '304', '401', '402', '403', '404', '501', '502', '503', '504', '601', '602', '603', '604', '701', '702', '703', '704', '801', '802', '803', '804', '901', '902', '903', '904', '1001', '1002', '1003', '1004');
delete from public.tipologias where empreendimento_id = '0d3e0000-0000-4000-8000-000000000010' and id not in ('0d3e0000-0000-4000-8000-000000000101', '0d3e0000-0000-4000-8000-000000000102');
