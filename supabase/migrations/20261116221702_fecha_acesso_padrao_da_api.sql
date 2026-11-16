-- Fecha o acesso padrão da API no schema public (recomendação do /security-review do PR #21).
--
-- Problema: a proteção do preço "sob consulta" (e de outras colunas) depende de
-- anon/authenticated NÃO terem acesso à tabela inteira. Isso dependia de uma
-- opção do PROJETO ("Automatically expose new tables"), não do código: num
-- projeto novo (produção, banco local) o padrão expõe tudo. Mesmo com a opção
-- desligada, as tabelas novas ainda davam TRUNCATE, REFERENCES, TRIGGER e
-- MAINTAIN para anon/authenticated.
--
-- Solução: as próprias migrations garantem o acesso mínimo, em qualquer ambiente.

-- 1) Daqui em diante, nada criado pelo postgres no public nasce acessível pela API.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

-- 2) Tabelas atuais: zera tudo e concede de novo só o planejado.
revoke all on table
  public.saude,
  public.perfis,
  public.empreendimentos,
  public.tipologias,
  public.comodos,
  public.unidades
from anon, authenticated;

-- saude (health check do /lab/supabase)
grant select on public.saude to anon, authenticated;

-- perfis (ver 20261116215353_perfis_empreendimentos.sql)
grant select (id, nome, whatsapp, creci, avatar_url, logo_url, cor_marca)
  on public.perfis to anon;
grant select on public.perfis to authenticated;
grant update (nome, whatsapp, creci, avatar_url, logo_url, cor_marca, notificar_leads_email)
  on public.perfis to authenticated;

-- empreendimentos (ver 20261116220417_limita_colunas_editaveis_empreendimentos.sql)
grant select on public.empreendimentos to anon;
grant select, insert, delete on public.empreendimentos to authenticated;
grant update (
  tipo, nome, slug, descricao, endereco, cidade, uf, latitude, longitude,
  numero_andares, unidades_por_andar, capa_url, construtora,
  registro_incorporacao, previsao_entrega, informacoes_conferidas_em, status
) on public.empreendimentos to authenticated;

-- tipologias, comodos, unidades (ver 20261116220834_tipologias_comodos_unidades.sql)
grant select on public.tipologias to anon;
grant select, insert, delete on public.tipologias to authenticated;
grant update (nome, quartos, suites, banheiros, vagas, area_privativa_m2, planta, planta_imagem_url)
  on public.tipologias to authenticated;

grant select on public.comodos to anon;
grant select, insert, delete on public.comodos to authenticated;
grant update (nome, tipo, descricao, area_m2, geometria, ordem)
  on public.comodos to authenticated;

grant select (
  id, empreendimento_id, tipologia_id, andar, numero, posicao_no_andar,
  exibir_preco, preco_publico, status
) on public.unidades to anon;
grant select, delete on public.unidades to authenticated;
grant insert (
  empreendimento_id, tipologia_id, andar, numero, posicao_no_andar,
  preco, exibir_preco, status, observacoes
) on public.unidades to authenticated;
grant update (
  tipologia_id, andar, numero, posicao_no_andar, preco, exibir_preco, status, observacoes
) on public.unidades to authenticated;
