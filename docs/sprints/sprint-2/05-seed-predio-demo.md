---
title: "Seed do prédio demo"
labels: "tipo:feature,area:banco"
---
## Contexto
Para desenvolver o painel (Sprint 3) e o tour (Sprint 4) precisamos de um prédio realista no banco. Ele também será a demo do portfólio.

## O que fazer
- [ ] Esquema Zod da planta em `src/lib/validacoes/planta.ts` (`comodos.geometria` e `tipologias.planta`, formato do `docs/03`, com `versao`)
- [ ] Corretor de demonstração (perfil com nome, WhatsApp fictício, CRECI fictício e cor da marca)
- [ ] Empreendimento "Residencial Demo" publicado, 10 andares × 4 unidades, com dados de segurança da compra preenchidos
- [ ] 2 tipologias (ex.: Tipo A 2 quartos 65 m², Tipo B 3 quartos 82 m²) com cômodos em retângulos (geometria válida pelo esquema Zod)
- [ ] 40 unidades com status e preços variados, incluindo algumas "sob consulta"
- [ ] O seed é **repetível** (rodar duas vezes não duplica nada)
- [ ] Teste unitário do esquema Zod da planta
- [ ] Documentar como aplicar no `docs/03`

## Arquivos envolvidos
`supabase/seed.sql`, `src/lib/validacoes/planta.ts`, `src/lib/validacoes/planta.test.ts`, `docs/03-modelagem-de-dados.md`

## Critérios de aceite
- [ ] Depois do seed, o visitante lê o empreendimento demo e as 40 unidades (com `preco_publico` nulo nas "sob consulta")
- [ ] Todas as geometrias do seed passam no esquema Zod
- [ ] Rodar o seed duas vezes não duplica registros

## Como testar
Aplicar o seed no `vitrine3d-dev` (comando documentado na issue) e conferir no painel do Supabase (Table Editor) e com `npm run test:rls`.
