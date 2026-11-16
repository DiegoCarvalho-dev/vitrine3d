-- Recomendação do /security-review do PR #20 (issue #13):
-- o corretor só edita as colunas do formulário do empreendimento.
-- id, dono_id, criado_em e atualizado_em ficam de fora:
-- - id: as próximas tabelas (tipologias, unidades...) apontam para ele;
-- - dono_id: a policy já impede transferir, aqui nem a coluna é editável;
-- - criado_em / atualizado_em: controlados pelo banco.

revoke update on public.empreendimentos from authenticated;

grant update (
  tipo,
  nome,
  slug,
  descricao,
  endereco,
  cidade,
  uf,
  latitude,
  longitude,
  numero_andares,
  unidades_por_andar,
  capa_url,
  construtora,
  registro_incorporacao,
  previsao_entrega,
  informacoes_conferidas_em,
  status
) on public.empreendimentos to authenticated;
