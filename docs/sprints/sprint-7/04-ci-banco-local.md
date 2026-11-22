---
title: "CI com banco de teste: RLS e testes de navegador"
labels: "tipo:chore,area:infra,area:banco,modelo:opus"
---
## Contexto
Os testes de RLS e de navegador usam o banco de desenvolvimento na nuvem. No CI isso exigiria colocar chaves reais no GitHub e misturaria dados de teste com o banco de verdade. O certo é um banco descartável: o Supabase local (Docker) sobe no CI com as migrations e o seed, roda os testes e some.

## O que fazer
- [ ] No CI: `supabase start`, aplicar as migrations e o seed, e rodar `test:rls` e `test:e2e` (desktop e celular) contra esse banco
- [ ] Ajustar os scripts de teste para aceitar o banco local (hoje usam `--remote`): uma variável escolhe local ou nuvem
- [ ] Teste de jornada completa, rodado no CI: prédio → unidade → caminhar → formulário → lead no painel → situação → apagar
- [ ] Guardar os prints e o relatório do Playwright quando algo falhar (artefato do CI)
- [ ] Documentar em `docs/04` como rodar o mesmo banco local no computador

## Arquivos envolvidos
`.github/workflows/ci.yml`, `supabase/tests/rls/rodar.mjs`, `tests/fixtures.ts`, `tests/global-setup.ts`, `tests/jornada.spec.ts`, `docs/04-fluxo-de-trabalho.md`

## Critérios de aceite
- [ ] O CI roda RLS e e2e sem nenhuma chave do banco de desenvolvimento
- [ ] Um teste quebrado deixa o PR vermelho, com o print do erro para baixar

## Como testar
Abrir um PR e ver as etapas "RLS" e "e2e" no CI; baixar o relatório do Playwright.
