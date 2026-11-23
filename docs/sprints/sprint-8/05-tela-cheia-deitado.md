---
title: "Tela cheia com o celular deitado"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
Ideia do usuário: no celular em pé, o 3D da unidade fica pequeno. Uma opção de tela cheia, com o celular deitado, dá muito mais espaço para ver a sala ou a cozinha. É opcional: quem não quiser continua com a página normal.

## O que fazer
- [ ] Botão de tela cheia no 3D da unidade (Fullscreen API); no Android, tentar travar na horizontal (`screen.orientation.lock`)
- [ ] iPhone (sem tela cheia de verdade): o 3D ocupa a tela toda e mostra a dica "vire o celular"
- [ ] Em tela cheia: só o essencial (voltar, alternar vista de cima e caminhar); sair com o botão ou o gesto de voltar
- [ ] Redimensionar a cena ao girar o celular, sem recarregar

## Referências
- Players de vídeo e tours 360° (Kuula): um botão de tela cheia, controles somem durante o uso

## Arquivos envolvidos
`src/components/three/unit-viewer.tsx`, `src/app/e/[slug]/u/[numero]/unit-tour.tsx`, `src/lib/fullscreen.ts` (novo), `tests/tour-unidade.spec.ts`

## Critérios de aceite
- [ ] No Android, um toque deixa o 3D em tela cheia e deitado; voltar devolve a página como estava
- [ ] No iPhone, o 3D ocupa a tela toda com a dica de girar
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
Abrir uma unidade no celular, tocar em tela cheia, girar o celular, caminhar e sair.
