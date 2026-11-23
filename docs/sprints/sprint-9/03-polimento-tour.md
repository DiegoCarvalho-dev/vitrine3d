---
title: "Polimento visual do tour público"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
Aplica no tour público os itens aprovados da revisão (issue 1), seguindo a regra da tela limpa. A lista final de itens vem da issue 1; abaixo, os já conhecidos.

## O que fazer
- [ ] Aplicar os itens do tour aprovados no `docs/06`
- [ ] Hierarquia clara: prédio e unidades primeiro; formulário e segurança da compra sem competir com o 3D
- [ ] Revisar textos, espaçamentos e tamanhos de toque no celular (mínimo 44 px)
- [ ] Conferir acessibilidade (axe) e contraste depois das mudanças

## Arquivos envolvidos
`src/app/e/[slug]/*`, `src/app/e/[slug]/u/[numero]/*`, `tests/{tour,tour-unidade,jornada}.spec.ts`

## Critérios de aceite
- [ ] Todos os itens do tour aprovados na issue 1 feitos
- [ ] Nenhuma violação nova do axe
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
Abrir o tour e a unidade no celular, comparar com os prints do antes.
