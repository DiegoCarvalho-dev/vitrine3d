---
title: "CI nos PRs: lint, tipos, testes unitários e build"
labels: "tipo:chore,area:infra,prioridade:alta,modelo:sonnet"
---
## Contexto
Hoje os testes rodam só no computador do desenvolvedor. Com o CI (GitHub Actions), cada PR é conferido sozinho, do mesmo jeito, antes do merge.

## O que fazer
- [ ] Workflow `.github/workflows/ci.yml` em todo PR e push na `main`: `npm ci`, `lint`, `format:check`, `typecheck`, `test` e `build`
- [ ] Cache do npm e do `.next/cache` (CI rápido, meta: menos de 5 minutos)
- [ ] Build sem segredos: variáveis públicas de exemplo no CI (nada do `.env.local`); nenhum segredo no log
- [ ] Selo do CI no `README.md` e seção "Como o CI funciona" em `docs/04`
- [ ] Testes: um PR de prova que quebra o lint e fica vermelho; o mesmo PR corrigido fica verde

## Arquivos envolvidos
`.github/workflows/ci.yml`, `README.md`, `docs/04-fluxo-de-trabalho.md`

## Critérios de aceite
- [ ] Todo PR mostra o resultado do CI antes do merge
- [ ] O CI não usa nenhuma chave real

## Como testar
Abrir um PR qualquer e ver os passos do CI ficarem verdes na aba "Checks".
