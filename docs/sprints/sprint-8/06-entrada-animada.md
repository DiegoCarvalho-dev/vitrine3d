---
title: "Entrar na unidade com animação, já por dentro"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
Ideia do usuário: ao escolher a unidade no prédio, a câmera "entra" nela com uma animação, e a página da unidade abre já por dentro (3D), com a vista de cima como opção. Hoje a troca é seca (outra página) e a unidade abre na vista de cima.

## O que fazer
- [ ] No prédio, ao tocar "Ver por dentro": a câmera aproxima da unidade escolhida (~1 s) e então abre a página da unidade
- [ ] A unidade abre na vista de dentro (a partir da sala ou da entrada); botão para a vista de cima
- [ ] Sem WebGL ou com "menos movimento": sem animação, abre direto (planta 2D continua igual)
- [ ] Link compartilhado (`/e/[slug]/u/[numero]`) também abre por dentro

- [ ] **Sem corte automático do prédio** (pedido do usuário, 24/11): ao escolher uma unidade, o prédio continua inteiro; a unidade ganha destaque (contorno na cor da marca) e a câmera gira devagar até ela. O corte por andar só acontece quando a pessoa escolhe o andar no filtro

## Referências
- Seletores de unidades (Planpoint, CuEngine): zoom contínuo do prédio até a unidade

## Arquivos envolvidos
`src/app/e/[slug]/tour-building.tsx`, `src/components/three/{BuildingPreview.tsx,unit-viewer.tsx}`, `src/app/e/[slug]/u/[numero]/unit-tour.tsx`, `tests/{tour,tour-unidade,jornada}.spec.ts`

## Critérios de aceite
- [ ] Do prédio até dentro da unidade em uma transição contínua (sem tela branca)
- [ ] Abrir o link direto da unidade mostra o interior em menos de 3 s no Android médio
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

- [ ] Escolher uma unidade não esconde os andares de cima; ela aparece destacada e a câmera vai até ela

## Como testar
No celular, escolher a 603 no prédio, tocar "Ver por dentro" e ver a câmera entrando; trocar para a vista de cima e voltar.
