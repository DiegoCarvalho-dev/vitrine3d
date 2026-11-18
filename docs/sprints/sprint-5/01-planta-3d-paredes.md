---
title: "Planta em 3D: paredes a partir dos cômodos"
labels: "tipo:feature,area:3d,area:tour,prioridade:alta,modelo:opus"
---
## Contexto
Os cômodos (polígonos em metros, `docs/03`) viram o apartamento em 3D: piso por cômodo e paredes com o pé-direito de cada um. É a base da vista de cima e do modo caminhar.

## O que fazer
- [ ] Gerar paredes nas bordas dos polígonos (parede compartilhada entre dois cômodos vira uma só), com espessura fixa
- [ ] Piso com cor/material por tipo de cômodo; teto opcional (escondido na vista de cima)
- [ ] Geometria mesclada (poucas chamadas de desenho) e calculada uma vez por tipologia
- [ ] Funciona com retângulos e com cômodos em L (seed)
- [ ] Testes: unitários da geração de paredes (bordas compartilhadas, L, pé-direito)

## Arquivos envolvidos
`src/lib/planta/walls.ts`, `src/components/three/unit-model.tsx`

## Critérios de aceite
- [ ] A planta do Residencial Demo aparece certa em 3D (comparar com a prévia 2D do painel)
- [ ] Sem paredes duplicadas onde dois cômodos se encostam
- [ ] Leve no celular

## Como testar
Abrir a unidade do demo e comparar com a prévia 2D da tipologia.
