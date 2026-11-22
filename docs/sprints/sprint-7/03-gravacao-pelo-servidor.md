---
title: "Só o servidor grava leads e eventos"
labels: "tipo:feature,area:banco,seguranca,prioridade:alta,modelo:opus"
---
## Contexto
Hoje a chave pública (que vai no navegador) permite inserir leads e eventos direto na API, sem passar pelo site. Quem fizer isso pula a validação, o campo isca e o tempo mínimo, e pode encher o painel de spam ou de visitas falsas (limitação registrada na Sprint 6, `docs/03`).

## O que fazer
- [ ] Migration: tirar o INSERT do visitante (`anon`) em `leads` e `eventos`; o servidor (`service_role`) ganha só o INSERT dessas tabelas
- [ ] `sendLead` e `/api/eventos` gravam pelo cliente do servidor, depois da validação Zod, conferindo antes que o empreendimento está publicado e que a unidade e o cômodo são dele (o que o RLS fazia)
- [ ] Limite por IP guardado no banco (um resumo/hash do IP, nunca o IP em si), valendo para todas as instâncias da Vercel; o limite por sessão continua
- [ ] Sem a chave do servidor (ambiente sem segredo), o tour continua funcionando e o formulário avisa que não conseguiu enviar
- [ ] Atualizar `docs/03` (tabela de permissões) e os testes de RLS (visitante não insere mais nada)
- [ ] Testes: RLS (anon sem INSERT), unitários e e2e do formulário e dos eventos continuam passando

## Arquivos envolvidos
`supabase/migrations/*`, `src/app/e/[slug]/actions.ts`, `src/app/api/eventos/route.ts`, `src/lib/rate-limit.ts`, `supabase/tests/rls/*`, `docs/03-modelagem-de-dados.md`

## Critérios de aceite
- [ ] Um `POST` direto na API do Supabase com a chave pública em `leads` ou `eventos` é recusado
- [ ] Lead e eventos pelo site continuam funcionando (e o e-mail ao corretor também)

## Como testar
Enviar o formulário pelo tour (funciona) e tentar inserir um lead direto na API com a chave pública (recusado).
