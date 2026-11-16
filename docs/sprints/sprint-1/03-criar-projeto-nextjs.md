---
title: "Criar o projeto Next.js com TypeScript, Tailwind, ESLint e Prettier"
labels: "tipo:chore,area:infra,prioridade:alta"
---
## Contexto
Esqueleto da aplicação, conforme a estrutura em `docs/02-stack-e-arquitetura.md`.

## O que fazer
- [ ] Rodar `npx create-next-app@latest` na raiz do repositório com: TypeScript, ESLint, Tailwind, `src/`, App Router, alias `@/*`
- [ ] Instalar e configurar **Prettier** (+ `prettier-plugin-tailwindcss`) e integrar ao ESLint
- [ ] Adicionar scripts no `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `format`
- [ ] Ativar `"strict": true` no `tsconfig.json`
- [ ] Criar `.env.example` (vazio por enquanto) e garantir `.env*.local` no `.gitignore`
- [ ] Criar `.vscode/settings.json` com formatar ao salvar e `.vscode/extensions.json` com as extensões recomendadas
- [ ] Trocar a página inicial padrão por uma página simples "Vitrine 3D – em construção"

## Arquivos envolvidos
`package.json`, `tsconfig.json`, `eslint.config.*`, `.prettierrc`, `.gitignore`, `.env.example`, `.vscode/*`, `src/app/*`

## Critérios de aceite
- [ ] `npm run dev` abre a página em http://localhost:3000
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` passam sem erro
- [ ] Salvar um arquivo no VS Code formata automaticamente

## Como testar
```bash
npm run lint && npm run typecheck && npm run build
```
Abrir http://localhost:3000 no desktop e no modo celular do DevTools (390 px).
