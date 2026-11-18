---
title: "Filtros do tour"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
O cliente quer achar "3 quartos até R$ 500 mil, andar alto". Os filtros destacam no prédio as unidades que servem e apagam as outras.

## O que fazer
- [ ] Filtros: quartos (da tipologia), faixa de preço (só `preco_publico`; "sob consulta" aparece em qualquer faixa, com aviso), andar (de–até) e "só disponíveis"
- [ ] Unidades fora do filtro ficam esmaecidas no 3D; contador "12 unidades encontradas"
- [ ] Filtros na URL (`?quartos=3&ate=500000`) para o corretor mandar um link já filtrado
- [ ] No celular, filtros numa gaveta que abre de baixo
- [ ] Testes: unitário da regra de filtro; e2e de aplicar e limpar filtros

## Arquivos envolvidos
`src/lib/tour/filters.ts`, `src/app/e/[slug]/*`, `tests/tour.spec.ts`

## Critérios de aceite
- [ ] Filtrar por preço nunca revela o preço de uma unidade "sob consulta"
- [ ] Link com filtros abre já filtrado
- [ ] Funciona no celular (390 px)

## Como testar
Filtrar por 3 quartos e "só disponíveis", copiar o link e abrir em outra aba.
