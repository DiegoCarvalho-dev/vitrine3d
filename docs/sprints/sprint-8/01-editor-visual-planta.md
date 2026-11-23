---
title: "Editor visual: desenhar, mover e redimensionar cômodos na grade"
labels: "tipo:feature,area:painel,prioridade:alta,modelo:opus"
---
## Contexto
É o item do MVP que falta (`docs/01`: "o corretor desenha os cômodos como retângulos numa grade"). Hoje o corretor digita largura, comprimento e posição de cada cômodo; funciona, mas é lento e difícil de imaginar. A prévia SVG já existe (`floor-plan-preview.tsx`) e o formato da planta não muda: o editor só gera os mesmos `pontos` de hoje.

## O que fazer
- [ ] Grade em SVG (1 quadrado = 1 m, encaixe de 10 cm) com zoom e arrastar a vista
- [ ] Desenhar um cômodo arrastando (desktop) ou tocando dois cantos (celular); escolher nome e tipo depois
- [ ] Mover e redimensionar pelos cantos e lados, mostrando as medidas (m e m²) enquanto arrasta
- [ ] Aviso de cômodos sobrepostos (mesma regra de hoje, `geometry.ts`) antes de salvar; desfazer (Ctrl+Z e botão)
- [ ] Salvar tudo de uma vez pela Server Action (Zod no cliente e no servidor; só o dono da tipologia)
- [ ] O formulário numérico continua como alternativa (acessibilidade e ajuste fino)

## Referências
- floorplanner.com e magicplan: desenhar arrastando, medidas ao vivo, encaixe na grade
- Matterport (planta gerada): leitura limpa, só o essencial na tela

## Arquivos envolvidos
`src/app/(painel)/painel/empreendimentos/[id]/tipologias/[tipologiaId]/{rooms-editor.tsx,actions.ts}`, `src/components/floor-plan-editor.tsx` (novo), `src/lib/planta/geometry.ts`, `src/lib/validacoes/comodo.ts`, `tests/comodos.spec.ts`

## Critérios de aceite
- [ ] Desenhar uma planta de 2 quartos em menos de 3 minutos, no desktop e no celular
- [ ] Medidas e área iguais às do formulário numérico; o 3D da unidade reflete o desenho
- [ ] Sobreposição é avisada e não salva
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
No painel, abrir uma tipologia, desenhar sala, cozinha e quarto, mover um, desfazer, salvar e abrir a unidade no tour.
