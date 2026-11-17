-- Issue #29: o corretor só apaga um empreendimento que NÃO tem leads.
-- Com leads, ele arquiva (os contatos ficam preservados). Decisão da Sprint 3:
-- o corretor não perde leads por engano, nem chamando a API direto.
--
-- Excluir a CONTA continua apagando tudo, leads inclusive (LGPD, teste 04):
-- a cascata da chave estrangeira não passa pelo RLS.
-- A subconsulta em leads usa o RLS de leads ("dono lê os seus"), que só
-- consulta empreendimentos para SELECT: não há recursão entre as políticas.

drop policy "empreendimentos: dono apaga" on public.empreendimentos;

create policy "empreendimentos: dono apaga os sem leads"
  on public.empreendimentos
  for delete
  to authenticated
  using (
    (select auth.uid()) = dono_id
    and not exists (
      select 1 from public.leads l where l.empreendimento_id = empreendimentos.id
    )
  );
