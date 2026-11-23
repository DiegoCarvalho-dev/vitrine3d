---
title: "Portas e janelas no editor"
labels: "tipo:feature,area:painel,area:3d,modelo:opus"
---
## Contexto
Hoje as portas são automáticas (ou salvas em `planta.portas`) e as janelas já existem no formato (`planta.janelas`, com peitoril e altura) e no 3D, mas não há tela para colocar. Sem janelas, o apartamento parece uma caixa fechada.

## O que fazer
- [ ] No editor: tocar numa parede para pôr uma porta ou janela; arrastar para mover; largura com encaixe
- [ ] Porta só em parede entre cômodos ou na entrada; janela só em parede externa (avisa se não der)
- [ ] Portas automáticas continuam como ponto de partida (botão "sugerir portas")
- [ ] Salvar em `planta.portas` e `planta.janelas` (mesmo formato; Zod no cliente e no servidor)
- [ ] Colisão do modo caminhar respeita as portas desenhadas (já usa `planta.portas`)

## Referências
- magicplan / RoomSketcher: portas e janelas como "peças" que encaixam na parede

## Arquivos envolvidos
`src/components/floor-plan-editor.tsx`, `src/lib/planta/{doors.ts,walls.ts,collision.ts}`, `src/lib/validacoes/planta.ts`, `src/components/three/unit-model.tsx`, `tests/tour-unidade.spec.ts`

## Critérios de aceite
- [ ] Uma janela desenhada aparece no 3D (com peitoril) e uma porta desenhada deixa passar no modo caminhar
- [ ] Janela em parede interna é recusada com aviso claro
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
Desenhar uma janela na sala e uma porta entre sala e quarto, abrir o tour e caminhar passando pela porta.
