---
title: "Tocar no chão para andar até lá"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
Ideia do usuário desde a Sprint 5: o joystick funciona, mas não é o jeito mais natural. Tocar no chão e a câmera ir até lá (como no Matterport) é mais fácil para quem nunca jogou videogame.

## O que fazer
- [ ] Tocar ou clicar no chão: mostra um marcador e a câmera desliza até o ponto, desviando de paredes e móveis
- [ ] Tocar fora do alcance (atrás da parede): vai até o ponto mais próximo possível
- [ ] Arrastar continua girando a vista; o joystick fica como opção (escondido num botão)
- [ ] Respeitar "menos movimento" (`prefers-reduced-motion`): pula direto, sem deslizar

## Referências
- Matterport: círculo no chão indica para onde vai; o movimento é suave e curto

## Arquivos envolvidos
`src/components/three/{walk-controls.tsx,unit-viewer.tsx,walk-joystick.tsx}`, `src/lib/planta/collision.ts`, `tests/tour-unidade.spec.ts`

## Critérios de aceite
- [ ] Dá para ir da sala ao quarto só tocando, sem atravessar parede
- [ ] Fluido no Android médio
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
No celular, entrar no modo caminhar e ir até a cozinha só tocando no chão.
