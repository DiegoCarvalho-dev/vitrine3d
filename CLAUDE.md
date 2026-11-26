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
- **Sprint 2 – Banco e login: concluída** (#13 a #19): banco completo com RLS e 149 testes (`npm run test:rls`), seed do Residencial Demo (`npm run db:seed:gerar` / `npm run db:seed`), login (`src/proxy.ts`, `src/lib/auth/*`; confirmação de e-mail desligada no dev) e perfil (`/painel/perfil`, WhatsApp em E.164). Toda página do painel usa `getCurrentProfile`/`requireUserId`.
- **Sprint 3 – Painel: concluída** (#27 a #34). Existe: Storage `midias` com upload comprimido (`src/components/image-upload.tsx`), edição/publicação/exclusão do empreendimento (`/painel/empreendimentos/[id]`; checklist em `src/lib/empreendimentos/publish.ts`; com leads só arquiva, garantido por policy + trigger), tipologias, cômodos com prévia SVG (`src/lib/planta/geometry.ts`, `src/components/floor-plan-preview.tsx`), unidades em grade com edição em lote (`[id]/unidades/*`; leitura paginada em `src/lib/supabase/fetch-all.ts`). e2e usam um corretor de sessão (`tests/global-setup.ts`, `tests/fixtures.ts`) e o fluxo completo roda com axe (`tests/fluxo-painel.spec.ts`).
- **Banco:** migrations aplicadas no `vitrine3d-dev` pelo próprio Claude com `--yes` (autorizado pelo usuário, só no dev; `--dry-run` antes). Regras de RLS/GRANT em `docs/03`. Toda função nova faz `revoke execute ... from public, anon, authenticated` (o teste `00_privilegios.sql` falha se esquecer). Exceção: função que o painel chama pela API (`security invoker`, o RLS decide, ex.: `resumo_visitas`, `salvar_comodos`) faz `revoke` de `public, anon`, `grant` só para `authenticated` e entra na lista de liberadas do teste.
- **Sprint 4 – Tour do prédio: concluída** (#8, #12, #43 a #47). No ar em https://vitrine3d-jade.vercel.app (Vercel, região `gru1`, cabeçalhos de segurança em `next.config.ts`). Página pública `/e/[slug]` sempre pelo cliente **anônimo** tipado (`src/lib/supabase/anon.ts`, `src/lib/tour/queries.ts`): o visitante só vê `preco_publico`. Prédio 3D com instancing (`src/components/three/BuildingPreview.tsx`) e SVG de reserva, filtros na URL (`src/lib/tour/filters.ts`), corte por andar e ficha da unidade (`?unidade=`), prévia no WhatsApp (Open Graph + `/e/[slug]/og`).
- **Sprint 5 – Tour da unidade: concluída** (#48 a #53). Página `/e/[slug]/u/[numero]`: planta 3D gerada dos cômodos (`src/lib/planta/walls.ts`, `doors.ts`, `src/components/three/unit-model.tsx`), portas automáticas ou salvas em `planta.portas`, vista de cima com etiquetas (`unit-viewer.tsx`, `room-labels.tsx`), modo caminhar com colisão (`src/lib/planta/collision.ts`, `walk-controls.tsx`, `walk-joystick.tsx`), qualidade automática (`adaptive-quality.tsx`), planta 2D sem WebGL (`src/lib/webgl.ts`). Laboratório sem login em `/lab/planta`. Medições do 3D: `node scripts/medir-3d.mjs <url>`.
- Desenvolvimento em `localhost`; celular testa pela Wi-Fi em `http://<ip-do-pc>:3000` ou direto no site publicado.
- **Supabase CLI v3:** local por padrão; use `--remote` para o projeto na nuvem (ver `docs/03`). Alterações no banco hospedado pedem confirmação do usuário.
- **Branches:** a `main` está **protegida** (issue #83): **tudo entra por branch + Pull Request** (`feat|fix|chore/<n>-descricao`), inclusive docs e configuração; merge só com os checks obrigatórios verdes (squash). Push direto é recusado. Detalhes em `docs/04`.
- **Sprint 6 – Leads e analytics: concluída** (#67 a #73). Eventos de visita (`/api/eventos`, `src/lib/tour/events.ts`, limite por sessão no banco), botão WhatsApp, formulário de interesse com LGPD (`sendLead`, `/privacidade`), e-mail ao corretor via Resend (`src/lib/email/*`, cliente admin só no servidor: `SUPABASE_SECRET_KEY` + `RESEND_API_KEY`; `service_role` só com os GRANTs necessários), painel de leads (`/painel/leads`, apagar leva o histórico junto), resumo do mês (`public.resumo_visitas`, contas no banco) e termômetro de interesse (`src/lib/leads/interest.ts`). Desde a #84 **só o servidor grava** leads e eventos (`src/lib/public-writes.ts`, limite por IP no banco, trigger que exige empreendimento publicado); a chave pública não insere nada.
- **Sprint 7 – Qualidade e CI: concluída** (#82 a #87): CI com 3 checks obrigatórios, `main` protegida, só o servidor grava leads/eventos, CSP com nonce e vigilância de dependências e segredos. Desempenho (#87): servidor responde em 60–70 ms (sem cache de página: a CSP com nonce exige página nova a cada visita); capa com preload e 3D só depois do `load`; LCP no Lighthouse no limite de 3 s (folga na Sprint 9); caminhar aprovado num Galaxy A13.
- **Sprint 8 – Editor de planta e unidade por dentro: concluída** (#105 a #110). Editor visual em SVG (`src/components/floor-plan-editor.tsx`, lógica em `src/lib/planta/editor.ts`), abas Desenhar/Medidas; salva a planta inteira numa transação (`public.salvar_comodos`, security invoker, apaga só o que foi tirado); portas e janelas no editor (`src/lib/planta/openings.ts`, `planta.portas_definidas`); móveis simples por cômodo (`src/lib/planta/furniture.ts`, um `InstancedMesh`, entram na colisão, `planta.moveis`); tocar no chão para andar (`src/lib/planta/path.ts`, joystick opcional); tela cheia com o celular deitado (`src/lib/fullscreen.ts`); a unidade abre por dentro, com entrada animada a partir do prédio, e escolher uma unidade não corta mais o prédio (o corte é só pelo filtro "Ver andar"). O evento "caminhou" conta só quando a pessoa anda de verdade.
- **Sprint 9 – Visual e pronto para o piloto: criada no GitHub** (`docs/sprints/sprint-9.md`, com a **regra da tela limpa**; começa pela #111, referências e revisão); Sprint 10 (piloto) só com roteiro. Ideia do usuário guardada para depois do MVP: vídeo para redes sociais a partir das fotos, levando ao tour (não implementar agora).
- **Testes e CI:** o CI (`.github/workflows/ci.yml`) tem três checks obrigatórios: `verificar` (formato, lint, tipos, unitários, build, `npm audit`), `segredos` (gitleaks) e `banco e navegador` (#85: Supabase local descartável com migrations + seed, `test:rls` e a suíte e2e inteira, inclusive `tests/jornada.spec.ts`; relatório como artefato se falhar). **Todo PR espera o CI verde antes do merge** (`gh pr checks --watch`). Localmente, só lint, tipos, unitários e o spec da parte mexida; `SUPABASE_DB_LOCAL=1` aponta os testes para o banco local (`tests/db-target.ts`, passo a passo em `docs/04`).
- **Segurança do site (#86):** CSP com nonce por visita (`src/proxy.ts`, `src/lib/csp.ts`, todas as páginas dinâmicas; Zod sem JIT no navegador em `src/instrumentation-client.ts`), `tests/csp.spec.ts` falha com qualquer violação; CI com `npm audit` (alto/crítico), gitleaks (job `segredos`) e Dependabot semanal.
- **O usuário é júnior e está aprendendo:** explique o porquê das decisões, em linguagem simples, e mostre os comandos que ele mesmo pode rodar.

## Como planejar uma nova sprint
Ao fim de uma sprint (ou quando o usuário pedir o planejamento da próxima):
1. Revise o que foi entregue, atualize a seção "Onde estamos" e marque o que mudou em `docs/`.
2. Use o rascunho de sprints em `docs/sprints/sprint-1.md` e o escopo do MVP em `docs/01` como base. Nada fora do escopo sem perguntar.
3. Crie `docs/sprints/sprint-N.md` (primeira linha `# Sprint N – Nome`, uma linha `**Objetivo:** ...` e a tabela de issues) e um arquivo por issue em `docs/sprints/sprint-N/NN-nome.md`, no mesmo formato da Sprint 1 (frontmatter `title`/`labels`, Contexto, O que fazer, Arquivos envolvidos, Critérios de aceite, Como testar).
4. Issues pequenas: no máximo 1 a 2 dias de trabalho cada. Se mexer em auth, RLS, uploads, formulários públicos ou env, inclua a label `seguranca`.
   Toda issue leva **uma** label de modelo recomendado (o usuário troca com `/model` antes de começar):
   - `modelo:opus`: banco/migrations, RLS, auth, segurança, 3D, arquitetura, bugs difíceis ou qualquer issue com `seguranca`.
   - `modelo:sonnet`: funcionalidade comum (telas, formulários, CRUD, testes) seguindo padrões que já existem.
   - `modelo:haiku`: docs, textos, configuração e ajustes pequenos e mecânicos.
   Na dúvida, suba um nível. A label é só referência: não pare o trabalho se o modelo em uso for outro.
5. **Mostre o plano ao usuário e espere a aprovação.** Só então faça o commit e rode `bash scripts/criar-sprint.sh N`.
6. **Planejamento em ondas:** mantenha sempre a sprint atual e a próxima **detalhadas** (issues no GitHub); as seguintes só como milestone com o objetivo e um roteiro curto. Ao fechar uma sprint, revise a próxima com o que foi aprendido e detalhe a seguinte. Assim o trabalho não para e as issues não envelhecem.

## Idioma
- Conversa, issues, commits e documentação em **português**.
- Código (variáveis, funções, componentes) em **inglês**. Tabelas e colunas do banco em **português snake_case** (como na modelagem).

## Fluxo obrigatório por issue
1. Ler a issue (`gh issue view N`) e confirmar o entendimento. Perguntar se houver ambiguidade.
2. Listar os arquivos que serão criados ou alterados.
3. Registrar o ANTES (print/descrição no navegador; para bug, escrever um teste que falha).
4. Implementar em passos pequenos.
5. Verificar o DEPOIS: `npm run lint`, `npm run typecheck`, `npm run test` e os testes da parte mexida (`test:rls` se mexeu no banco; o spec e2e da tela mexida, em desktop e 390 px). O resto (formato, build, suíte inteira) é do CI: abrir o PR e esperar ficar verde.
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
