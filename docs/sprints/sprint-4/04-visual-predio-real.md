---
title: "Visual do prédio: aparência de edifício real no 3D e na ilustração da home"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
O prédio hoje é um bloco de caixas coloridas. Para o cliente final, ele precisa parecer um edifício: é a primeira impressão do tour. Continua leve no celular (geometria simples, sem modelos pesados).

## O que fazer
- [ ] Fachada com lajes aparentes, janelas/vidro por unidade (a cor do status como faixa ou moldura, sem pintar o prédio inteiro)
- [ ] Térreo com entrada e cobertura/platibanda; sombra suave e luz de fim de tarde
- [ ] Material e cor neutros, com o tom da marca do corretor como detalhe
- [ ] Mesmo visual na ilustração SVG da home e do painel
- [ ] Texturas (se houver) em WebP/KTX2 e poucas chamadas de desenho (instancing)

## Arquivos envolvidos
`src/components/three/*`, `src/components/building-illustration.tsx`, `src/lib/building.ts`

## Critérios de aceite
- [ ] Lê como "prédio real" à primeira vista (aprovado no teste visual do usuário)
- [ ] Continua a 60 fps num celular médio
- [ ] Status das unidades continua fácil de ler (legenda e contraste)

## Como testar
Abrir o tour no celular e no desktop, comparar com o antes (print) e conferir a legenda dos status.
