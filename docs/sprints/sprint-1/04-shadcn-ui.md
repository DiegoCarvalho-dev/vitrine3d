---
title: "Configurar shadcn/ui, fontes e tema base"
labels: "tipo:chore,area:painel"
---
## Contexto
Base visual para o painel e o tour: componentes acessíveis e bonitos sem reinventar a roda.

## O que fazer
- [ ] Rodar `npx shadcn@latest init`
- [ ] Adicionar os componentes iniciais: `button`, `card`, `input`, `label`, `dialog`, `sonner` (toast)
- [ ] Definir fonte (ex.: Inter via `next/font`) e a cor primária do produto
- [ ] Suporte a modo claro/escuro (opcional nesta sprint)
- [ ] Usar os componentes na página "em construção" para validar

## Critérios de aceite
- [ ] Componentes em `src/components/ui/`
- [ ] Página inicial usa `Button` e `Card` do shadcn
- [ ] `lint`, `typecheck` e `build` passando

## Como testar
Abrir a página inicial e conferir os componentes no desktop e no celular.
