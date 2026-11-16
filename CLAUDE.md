# CLAUDE.md – Regras do projeto Vitrine 3D

## Sobre o projeto
Plataforma para corretores apresentarem imóveis em 3D por link, com captação de leads. Leia `docs/` antes de propor mudanças grandes:
- `docs/01-visao-do-produto.md`: escopo do MVP (não adicione funcionalidades fora dele sem perguntar)
- `docs/02-stack-e-arquitetura.md`: stack e estrutura de pastas
- `docs/03-modelagem-de-dados.md`: banco, RLS, formato da planta
- `docs/04-fluxo-de-trabalho.md`: **o fluxo obrigatório de cada issue**

## Onde estamos (atualize ao fim de cada sprint)
- **Planejamento concluído:** visão, stack, modelagem, fluxo de trabalho e pesquisa de mercado estão em `docs/` (01 a 05). Os itens da pesquisa marcados como MVP **já foram aprovados** e incorporados.
- **Sprint 1 – Ambiente: concluída** (#1 a #7; falta só a #9, de estudo, com o usuário). Existe: Next.js 16 + TS estrito, Tailwind + shadcn/ui (tema em `src/app/globals.css`), Vitest + Playwright (desktop + iPhone 13), Supabase conectado (projeto `vitrine3d-dev`, região São Paulo, tabela de teste `saude`), prova de conceito 3D em `/lab/3d`.
- **Fora da Sprint 1:** deploy na Vercel (#8) foi para o Backlog e volta na Sprint 4; visual de edifício real no 3D (#12) também na Sprint 4. Desenvolvimento em `localhost`; celular testa pela Wi-Fi em `http://<ip-do-pc>:3000`.
- **Supabase CLI v3:** local por padrão; use `--remote` para o projeto na nuvem (ver `docs/03`). Alterações no banco hospedado pedem confirmação do usuário.
- **Branches:** issues de ambiente/configuração/docs/testes vão **direto na `main`**. Funcionalidades, bugs e tudo que exige cuidado (banco, RLS, login, uploads, formulários públicos, 3D, label `seguranca`) vão em **branch a partir da `main` + PR** (`feat/<n>-descricao`, `fix/<n>-descricao`). Detalhes em `docs/04`. Proteção da `main` entra na Sprint 7.
- **Próximo planejamento:** Sprint 2 – Banco e login (rascunho em `docs/sprints/sprint-1.md`).
- **O usuário é júnior e está aprendendo:** explique o porquê das decisões, em linguagem simples, e mostre os comandos que ele mesmo pode rodar.

## Como planejar uma nova sprint
Ao fim de uma sprint (ou quando o usuário pedir o planejamento da próxima):
1. Revise o que foi entregue, atualize a seção "Onde estamos" e marque o que mudou em `docs/`.
2. Use o rascunho de sprints em `docs/sprints/sprint-1.md` e o escopo do MVP em `docs/01` como base. Nada fora do escopo sem perguntar.
3. Crie `docs/sprints/sprint-N.md` (primeira linha `# Sprint N – Nome`, uma linha `**Objetivo:** ...` e a tabela de issues) e um arquivo por issue em `docs/sprints/sprint-N/NN-nome.md`, no mesmo formato da Sprint 1 (frontmatter `title`/`labels`, Contexto, O que fazer, Arquivos envolvidos, Critérios de aceite, Como testar).
4. Issues pequenas: no máximo 1 a 2 dias de trabalho cada. Se mexer em auth, RLS, uploads, formulários públicos ou env, inclua a label `seguranca`.
5. **Mostre o plano ao usuário e espere a aprovação.** Só então faça o commit e rode `bash scripts/criar-sprint.sh N`.

## Idioma
- Conversa, issues, commits e documentação em **português**.
- Código (variáveis, funções, componentes) em **inglês**. Tabelas e colunas do banco em **português snake_case** (como na modelagem).

## Fluxo obrigatório por issue
1. Ler a issue (`gh issue view N`) e confirmar o entendimento. Perguntar se houver ambiguidade.
2. Listar os arquivos que serão criados ou alterados.
3. Registrar o ANTES (print/descrição no navegador; para bug, escrever um teste que falha).
4. Implementar em passos pequenos.
5. Verificar o DEPOIS: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run test:rls` (se mexeu no banco), `npm run build` e teste no navegador (desktop + 390 px), sem erros no console.
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
