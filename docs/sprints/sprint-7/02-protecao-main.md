---
title: "Proteção da main: só PR com CI verde"
labels: "tipo:chore,area:infra,modelo:haiku"
---
## Contexto
Com o CI pronto (issue 1), a `main` passa a aceitar só código que passou nos testes. Assim nada quebrado chega ao site publicado, que a Vercel atualiza a cada mudança na `main`.

## O que fazer
- [ ] Regra da `main`: PR obrigatório, CI verde obrigatório, sem force push e sem apagar a branch
- [ ] Aplicar com `gh api` (o usuário confirma) ou pela tela (Settings → Branches), com o passo a passo
- [ ] Atualizar `docs/04` e o `CLAUDE.md`: docs e configuração também passam a ir por PR (fim do "direto na main")

## Arquivos envolvidos
`docs/04-fluxo-de-trabalho.md`, `CLAUDE.md`

## Critérios de aceite
- [ ] Um push direto na `main` é recusado
- [ ] Um PR com CI vermelho não pode ser mergeado

## Como testar
Tentar `git push` direto na `main` (recusado) e abrir um PR com o CI vermelho (botão de merge bloqueado).
