---
title: "Prédio 3D com os dados reais"
labels: "tipo:feature,area:3d,area:tour,prioridade:alta,modelo:opus"
---
## Contexto
A prova de conceito em `/lab/3d` usa dados fixos. Agora o prédio do tour sai do banco: andares × unidades, cada unidade com a cor do status.

## O que fazer
- [ ] Componente do prédio em `src/components/three/` recebendo andares, unidades por andar e as unidades (status, número)
- [ ] Carregado com `dynamic(..., { ssr: false })`, com a ilustração em SVG como fallback enquanto carrega e sem WebGL
- [ ] Toque/clique numa unidade destaca e mostra número e status
- [ ] Selo "imagem ilustrativa" sobre o 3D
- [ ] Câmera que enquadra prédios de 1 a 50 andares
- [ ] Testes: unitário da montagem (unidade → posição e cor); e2e do toque numa unidade (desktop e celular)

## Arquivos envolvidos
`src/components/three/*`, `src/lib/building.ts`, `src/app/e/[slug]/*`, `tests/tour.spec.ts`

## Critérios de aceite
- [ ] As cores batem com o status no painel
- [ ] 60 fps num celular médio com um prédio de 10 × 4; sem travar com 30 × 8
- [ ] Funciona com toque e sem erros no console

## Como testar
Mudar o status de unidades no painel e conferir as cores no tour, no celular.
