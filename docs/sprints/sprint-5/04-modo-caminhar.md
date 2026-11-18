---
title: "Modo caminhar no desktop e no celular"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
Andar por dentro do apartamento na altura dos olhos é o "uau" do tour. Precisa funcionar bem no celular, onde está a maioria dos clientes.

## O que fazer
- [ ] Desktop: WASD/setas para andar, mouse para olhar (pointer lock com instrução clara)
- [ ] Celular: joystick virtual para andar e arrastar para olhar
- [ ] Colisão com as paredes (passa pelas portas da issue 2); altura dos olhos 1,6 m
- [ ] Botão para voltar à vista de cima; começar na entrada da unidade
- [ ] Testes: unitário da colisão; e2e de entrar no modo e voltar

## Arquivos envolvidos
`src/components/three/walk-controls.tsx`, `src/lib/planta/collision.ts`

## Critérios de aceite
- [ ] Não atravessa paredes; passa pelas portas
- [ ] Confortável no celular (sem enjoo: velocidade moderada, sem balanço)
- [ ] Sem erros no console

## Como testar
No celular, entrar no modo caminhar, ir da sala ao quarto e voltar à vista de cima.
