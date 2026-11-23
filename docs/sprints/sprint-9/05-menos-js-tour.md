---
title: "Menos JavaScript no início do tour"
labels: "tipo:chore,area:tour,modelo:sonnet"
---
## Contexto
Na #87 o tour ficou no limite de 3 s no Lighthouse (2,7 a 3,4 s): o servidor e a capa já estão rápidos, e o que segura a primeira pintura é o JavaScript inicial (React, formulário, filtros), com 2,6 a 2,9 s de bloqueio num celular lento.

## O que fazer
- [ ] Medir o tamanho do JS inicial por página (relatório do build) e registrar
- [ ] Formulário de interesse e filtros carregam só quando forem usados ou aparecerem na tela (o HTML continua vindo do servidor)
- [ ] Tirar do pacote inicial o que só o painel usa, se aparecer no tour
- [ ] Medir com Lighthouse (celular) antes e depois e registrar na issue

## Arquivos envolvidos
`src/app/e/[slug]/{page.tsx,lead-form.tsx,tour-building.tsx}`, `src/app/e/[slug]/u/[numero]/unit-tour.tsx`, `tests/{lead,tour}.spec.ts`

## Critérios de aceite
- [ ] Lighthouse (celular, 4G simulado): maior elemento abaixo de 3 s nas três páginas medidas na #87, em 3 rodadas seguidas
- [ ] Formulário e filtros continuam funcionando (e2e verdes)

## Como testar
Rodar o Lighthouse no tour com capa, sem capa e na unidade (comandos na #87).
