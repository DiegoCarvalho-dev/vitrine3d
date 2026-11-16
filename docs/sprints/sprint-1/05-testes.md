---
title: "Configurar testes: Vitest (unitário) e Playwright (navegador)"
labels: "tipo:chore,area:infra"
---
## Contexto
O fluxo de trabalho (`docs/04-fluxo-de-trabalho.md`) exige testes antes e depois de cada mudança. A estrutura precisa existir desde o início.

## O que fazer
- [ ] Instalar **Vitest** + Testing Library e criar `vitest.config.ts`
- [ ] Criar um teste unitário de exemplo (ex.: função `slugify` em `src/lib/`)
- [ ] Instalar **Playwright** (`npm init playwright@latest`) com pasta `tests/`
- [ ] Criar um teste e2e: abrir a página inicial e verificar o título
- [ ] Configurar no Playwright um projeto **desktop** e um **celular** (ex.: iPhone 13)
- [ ] Scripts: `test` (Vitest), `test:e2e` (Playwright)

## Critérios de aceite
- [ ] `npm run test` e `npm run test:e2e` passam
- [ ] Os relatórios e resultados do Playwright estão no `.gitignore`

## Como testar
```bash
npm run test
```
```bash
npm run test:e2e
```
