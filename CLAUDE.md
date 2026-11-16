# CLAUDE.md – Regras do projeto Vitrine 3D

## Sobre o projeto
Plataforma para corretores apresentarem imóveis em 3D por link, com captação de leads. Leia `docs/` antes de propor mudanças grandes:
- `docs/01-visao-do-produto.md`: escopo do MVP (não adicione funcionalidades fora dele sem perguntar)
- `docs/02-stack-e-arquitetura.md`: stack e estrutura de pastas
- `docs/03-modelagem-de-dados.md`: banco, RLS, formato da planta
- `docs/04-fluxo-de-trabalho.md`: **o fluxo obrigatório de cada issue**

## Idioma
- Conversa, issues, commits e documentação em **português**.
- Código (variáveis, funções, componentes) em **inglês**. Tabelas e colunas do banco em **português snake_case** (como na modelagem).

## Fluxo obrigatório por issue
1. Ler a issue (`gh issue view N`) e confirmar o entendimento. Perguntar se houver ambiguidade.
2. Listar os arquivos que serão criados ou alterados.
3. Registrar o ANTES (print/descrição no navegador; para bug, escrever um teste que falha).
4. Implementar em passos pequenos.
5. Verificar o DEPOIS: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` e teste no navegador (desktop + 390 px), sem erros no console.
6. Enviar ao usuário os prints e um **roteiro curto de teste visual**, e esperar o ok.
7. Rodar `/code-review`, e `/security-review` quando mexer em auth, RLS, uploads, formulários públicos, env ou Server Actions.
8. Commit em Conventional Commits citando a issue (`feat(tour): ... (#N)`).

## Regras técnicas
- TypeScript estrito; nada de `any` sem justificativa.
- Validar toda entrada com Zod (no cliente **e** no servidor).
- Toda mudança de banco é uma migration em `supabase/migrations/`; atualize a modelagem em `docs/` e regenere os tipos.
- RLS ativo em todas as tabelas. Nunca use a service role key no navegador.
- Componentes 3D ficam em `src/components/three/`; cenas 3D são client components (`"use client"`), carregadas com `dynamic(..., { ssr: false })` quando necessário.
- Performance no celular: geometria simples, texturas comprimidas (WebP/KTX2), nada de modelos pesados.
- Nunca commitar `.env*` (exceto `.env.example`).
