---
title: "Prédio 3D mais bonito"
labels: "tipo:feature,area:3d,modelo:opus"
---
## Contexto
O usuário acha o prédio 3D do tour mais feio que a ilustração da home. É a primeira coisa que o cliente vê. Dá para ficar bem mais bonito sem modelo pesado: térreo, janelas na fachada, vidro, sombra suave e céu.

## O que fazer
- [ ] Térreo e cobertura diferentes dos andares; fachada com janelas e vidro (instancing, sem texturas pesadas)
- [ ] Unidades continuam coloridas por status (disponível, reservada, vendida), legíveis sobre a fachada
- [ ] Iluminação: sombra suave e céu em degradê; chão com a sombra do prédio
- [ ] Qualidade automática: no celular fraco, menos detalhe (mesma lógica do `adaptive-quality.tsx`)

## Referências
- Planpoint e CuEngine: fachada estilizada, unidades em destaque por cor

## Arquivos envolvidos
`src/components/three/BuildingPreview.tsx`, `src/app/e/[slug]/tour-building.tsx`, `src/app/lab/3d`, `tests/{tour,lab-3d}.spec.ts`

## Critérios de aceite
- [ ] Prédio com cara de prédio, aprovado pelo usuário (antes e depois em print)
- [ ] Continua fluido no Android médio; corte por andar e cores por status funcionando

## Como testar
Abrir o Residencial Demo no celular, girar o prédio, filtrar e cortar um andar.
