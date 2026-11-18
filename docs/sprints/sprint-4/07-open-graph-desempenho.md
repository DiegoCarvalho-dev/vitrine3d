---
title: "Prévia no WhatsApp (Open Graph) e desempenho no celular"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
Quando o corretor cola o link no WhatsApp, aparece a prévia: capa, nome e "a partir de R$ …". E o tour precisa abrir em menos de 3 segundos no 4G (métrica do MVP).

## O que fazer
- [ ] Metadados Open Graph e Twitter da página `/e/[slug]` (título, descrição, capa 1200 × 630, nome do corretor)
- [ ] "A partir de R$ …" só com `preco_publico` (se tudo for "sob consulta", não mostra preço)
- [ ] Imagem de prévia gerada (`opengraph-image`) quando não houver capa
- [ ] Desempenho: 3D carregado depois do conteúdo, imagens com tamanho certo, fonte otimizada; medir com Lighthouse no modo celular
- [ ] Testes: e2e dos metadados; registro do Lighthouse na issue

## Arquivos envolvidos
`src/app/e/[slug]/page.tsx`, `src/app/e/[slug]/opengraph-image.tsx`, `next.config.ts`

## Critérios de aceite
- [ ] Prévia aparece no WhatsApp com capa e título
- [ ] Lighthouse (celular): conteúdo principal em menos de 3 s no 4G simulado
- [ ] Nenhum preço "sob consulta" nos metadados

## Como testar
Colar o link num chat do WhatsApp e rodar o Lighthouse no Chrome (modo celular).
