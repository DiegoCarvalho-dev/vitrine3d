---
title: "Polimento visual do painel"
labels: "tipo:feature,area:painel,modelo:sonnet"
---
## Contexto
Aplica no painel do corretor os itens aprovados da revisão (issue 1). O corretor usa o painel no dia a dia: precisa ser rápido de entender e sem excesso de opções na tela.

## O que fazer
- [ ] Aplicar os itens do painel aprovados no `docs/06`
- [ ] Início do painel com o que importa (leads novos, resumo do mês, atalho para o tour)
- [ ] Edição do empreendimento organizada em etapas claras (dados, tipologias, unidades, publicar)
- [ ] Conferir acessibilidade (axe) e uso no celular

## Arquivos envolvidos
`src/app/(painel)/painel/**`, `tests/{fluxo-painel,painel-leads,painel-resumo}.spec.ts`

## Critérios de aceite
- [ ] Todos os itens do painel aprovados na issue 1 feitos
- [ ] Nenhuma violação nova do axe
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
Fazer o fluxo completo do painel no celular (criar prédio, tipologia, unidades, publicar) e comparar com o antes.
