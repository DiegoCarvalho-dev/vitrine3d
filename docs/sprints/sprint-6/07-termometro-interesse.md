---
title: "Termômetro de interesse do lead"
labels: "tipo:feature,area:painel,modelo:sonnet"
---
## Contexto
Quem passou 6 minutos olhando a unidade 902, caminhou por dentro e voltou outro dia é um lead "quente": o corretor liga primeiro para ele (`docs/01`). Os eventos da issue 1 já trazem tudo o que é preciso.

## O que fazer
- [ ] Regra simples e explicável: pontos por tempo no tour, unidades abertas, cômodos vistos, modo caminhar e visitas em dias diferentes
- [ ] Faixas: quente, morno e frio, com o motivo ("voltou 3 vezes, caminhou na 902")
- [ ] Mostrar no painel de leads (selo e ordenação) e no e-mail do lead novo
- [ ] Testes: unitários da pontuação (cada regra e as faixas)

## Arquivos envolvidos
`src/lib/leads/interest.ts`, `src/app/(painel)/painel/leads/*`, `src/lib/email/*`

## Critérios de aceite
- [ ] O selo vem sempre com o motivo, em linguagem simples
- [ ] Lead sem eventos fica "frio" sem erro

## Como testar
Visitar o tour por alguns minutos, caminhar numa unidade, enviar o formulário e ver o lead "quente" no painel.
