---
title: "Demo para o portfólio e boas-vindas do corretor"
labels: "tipo:feature,area:painel,modelo:sonnet"
---
## Contexto
Para mostrar o produto (portfólio e primeiro corretor do piloto), falta uma demo caprichada e um começo guiado: hoje o corretor novo cai num painel vazio.

## O que fazer
- [ ] Residencial Demo completo no seed: capa, 2 tipologias desenhadas no editor, portas, janelas, móveis, preços e status variados
- [ ] Boas-vindas no primeiro acesso: 3 passos curtos (perfil, primeiro empreendimento, publicar), que somem depois de feitos
- [ ] Página inicial com o link da demo e um vídeo ou GIF curto do tour
- [ ] Roteiro de apresentação de 2 minutos em `docs/` (o que mostrar e em que ordem)

## Arquivos envolvidos
`supabase/seed/residencial-demo.json`, `scripts/seed/*`, `src/app/(painel)/painel/page.tsx`, `src/app/page.tsx`, `docs/07-roteiro-da-demo.md` (novo)

## Critérios de aceite
- [ ] Um corretor novo chega ao primeiro tour publicado seguindo só as boas-vindas
- [ ] A demo abre bonita no celular e passa pela jornada inteira
- [ ] Não adiciona botão fixo na tela sem tirar ou esconder outro (opções secundárias em menu/gaveta; ver docs/sprints/sprint-9.md, "tela limpa")

## Como testar
Criar uma conta nova, seguir as boas-vindas até publicar; abrir a demo pelo link da página inicial.
