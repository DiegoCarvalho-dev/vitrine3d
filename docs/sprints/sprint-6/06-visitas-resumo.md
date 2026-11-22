---
title: "Visitas e resumo do mês no painel"
labels: "tipo:feature,area:painel,modelo:sonnet"
---
## Contexto
"Seu tour gerou 12 leads e 340 visitas este mês" é o que mostra ao corretor que o produto vale a pena (`docs/05`, D1).

## O que fazer
- [ ] Cartão de resumo no início do painel: visitas (sessões), leads e cliques no WhatsApp do mês, com comparação ao mês anterior
- [ ] Por empreendimento: visitas, unidades mais vistas (top 5), cômodos mais vistos e quantos caminharam por dentro
- [ ] Contas feitas no banco (função ou view com RLS), sem trazer todos os eventos para o navegador
- [ ] Estado vazio com o próximo passo ("compartilhe o link do seu tour")
- [ ] Testes: unitário dos cálculos; e2e do resumo com eventos de teste

## Arquivos envolvidos
`src/app/(painel)/painel/page.tsx`, `src/lib/analytics/*`, `supabase/migrations/*`

## Critérios de aceite
- [ ] Os números batem com os eventos gravados
- [ ] Rápido mesmo com milhares de eventos

## Como testar
Abrir o tour algumas vezes em abas anônimas e conferir os números no painel.
