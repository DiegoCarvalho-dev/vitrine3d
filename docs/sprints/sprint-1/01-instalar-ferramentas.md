---
title: "Instalar e configurar as ferramentas de desenvolvimento"
labels: "tipo:chore,area:infra,prioridade:alta"
---
## Contexto
Antes de qualquer código, a máquina precisa ter as ferramentas da stack (ver `docs/02-stack-e-arquitetura.md`).

## O que fazer
- [ ] Instalar **Node.js LTS** (22 ou mais novo); se possível via `nvm` (Linux/macOS) ou `nvm-windows`/`fnm` (Windows)
- [ ] Instalar **Git** e configurar `user.name` e `user.email`
- [ ] Instalar **GitHub CLI** (`gh`) e logar com `gh auth login`
- [ ] Instalar **VS Code** e as extensões: Claude Code, ESLint, Prettier, Tailwind CSS IntelliSense (GitLens opcional)
- [ ] Instalar **Supabase CLI** (`npm i -g supabase` ou o instalador oficial)
- [ ] Instalar **Google Chrome** + extensão **Claude in Chrome**

## Critérios de aceite
- [ ] Todos os comandos abaixo retornam versão sem erro
- [ ] `gh auth status` mostra a conta logada
- [ ] O Claude Code abre no VS Code e responde

## Como testar
```bash
node -v && npm -v && git --version && gh --version && supabase --version
```
```bash
gh auth status
```

## Referências
- https://nodejs.org · https://cli.github.com · https://supabase.com/docs/guides/local-development/cli/getting-started
