---
title: "Vista de cima com etiquetas dos cômodos"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
A vista de cima ("casa de bonecas") é a mais clara para entender a planta: paredes sem teto, cada cômodo com nome e área.

## O que fazer
- [ ] Câmera de cima com leve inclinação, girar e aproximar (mouse e gestos de pinça)
- [ ] Etiqueta por cômodo (nome e área); tocar abre a descrição
- [ ] Selo "imagem ilustrativa" e área privativa da tipologia
- [ ] Testes: e2e de abrir a unidade e tocar numa etiqueta

## Arquivos envolvidos
`src/components/three/unit-viewer.tsx`, `src/components/three/room-labels.tsx`

## Critérios de aceite
- [ ] Etiquetas legíveis no celular e sem sobrepor
- [ ] Descrição do cômodo aparece ao tocar

## Como testar
Abrir uma unidade, girar a vista e tocar na sala.
