---
title: "Portas automáticas entre cômodos vizinhos"
labels: "tipo:feature,area:3d,modelo:opus"
---
## Contexto
Sem portas, não dá para caminhar entre os cômodos. Até o editor da Sprint 8, a porta é criada sozinha onde dois cômodos dividem parede.

## O que fazer
- [ ] Onde dois cômodos compartilham parede com pelo menos 0,9 m, abrir um vão de porta (0,8 × 2,1 m) no meio do trecho
- [ ] Regras simples: banheiro só abre para um cômodo; sala abre para todos; varanda abre para a sala ou quarto
- [ ] Respeitar `tipologias.planta.portas` quando existir (dados do seed ou do futuro editor)
- [ ] Testes: unitários (vão no lugar certo, regra do banheiro, trecho curto sem porta)

## Arquivos envolvidos
`src/lib/planta/doors.ts`, `src/lib/planta/walls.ts`

## Critérios de aceite
- [ ] Do hall dá para chegar a todos os cômodos do demo
- [ ] Nenhuma porta em parede externa

## Como testar
Na vista de cima, conferir que todo cômodo tem por onde entrar.
