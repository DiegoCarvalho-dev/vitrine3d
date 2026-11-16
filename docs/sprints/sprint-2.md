# Sprint 2 – Banco e login

**Objetivo:** criar todo o banco do MVP com RLS testado, um prédio de demonstração com dados reais e o login do corretor com o perfil dele. Ao final, um corretor cria a conta, entra no painel e edita o próprio perfil, e o banco garante que cada um só mexe no que é seu.

**Não é objetivo:** cadastro de empreendimentos pelo painel e upload de fotos (Sprint 3), tour público com dados reais (Sprint 4).

| # | Issue | Labels |
|---|---|---|
| 1 | [Banco: perfis, empreendimentos e tipos gerados](sprint-2/01-perfis-empreendimentos.md) | feature, banco, alta, segurança |
| 2 | [Banco: tipologias, cômodos e unidades (com preço oculto)](sprint-2/02-tipologias-comodos-unidades.md) | feature, banco, alta, segurança |
| 3 | [Banco: mídias, hotspots, leads e eventos](sprint-2/03-midias-hotspots-leads-eventos.md) | feature, banco, segurança |
| 4 | [Testes automatizados de RLS](sprint-2/04-testes-rls.md) | chore, banco, alta, segurança |
| 5 | [Seed do prédio demo](sprint-2/05-seed-predio-demo.md) | feature, banco |
| 6 | [Login do corretor (e-mail e senha)](sprint-2/06-login-corretor.md) | feature, painel, alta, segurança |
| 7 | [Perfil do corretor](sprint-2/07-perfil-corretor.md) | feature, painel, segurança |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 → 7. A 6 pode começar logo depois da 1 (só depende de `perfis`).

## Decisões desta sprint

- **Preço "sob consulta" sem view:** o RLS filtra linhas, não colunas. Em vez da view `unidades_publicas` prevista no `docs/03` (uma view comum ignora o RLS, e o advisor do Supabase a marca como erro), usamos uma **coluna gerada** `preco_publico` (`preco` quando `exibir_preco = true`, senão `null`) e **GRANT por coluna**: o visitante (`anon`) pode ler `preco_publico`, mas não `preco`. O `docs/03` é atualizado na issue 2.
- **Perfil público do corretor:** mesmo padrão. O visitante lê só as colunas públicas de `perfis` (nome, WhatsApp, CRECI, foto, logo, cor) e só de quem tem empreendimento publicado.
- **Login por e-mail e senha agora; link mágico depois.** O SMTP padrão do Supabase no plano grátis tem limite baixo de envios. No projeto de desenvolvimento, a confirmação de e-mail fica desligada; antes de ter clientes, configuramos SMTP próprio (Resend, já previsto na stack).
- **Cadastro aberto:** qualquer pessoa pode criar conta de corretor (bom para a demo do portfólio). Convite/aprovação fica para a Fase 4.
- **Sem Docker:** continuamos usando o projeto `vitrine3d-dev` na nuvem. Cada migration é aplicada com `supabase db push --remote`, que **pede confirmação do usuário**.
- **Branches:** todas as issues desta sprint são de banco/login, então todas vão em **branch + PR**.

## Próximas sprints (rascunho, a refinar)

- **Sprint 3 – Painel:** Storage (bucket `midias` + policies), CRUD de empreendimento, tipologias, cômodos, unidades; upload de capa e foto do corretor. Validar `avatar_url`, `logo_url` e `capa_url` com Zod (só `https:` ou caminho do nosso Storage) antes de exibir (apontado no /security-review do PR #20).
- **Sprint 4 – Tour (prédio):** deploy na Vercel (ex-#8), página pública `/e/[slug]`, prédio 3D com dados reais e visual de edifício real (#12), filtros, corte por andar, Open Graph.
- **Sprint 5 – Tour (unidade):** planta → 3D (paredes, portas), etiquetas, vista dollhouse, modo caminhar (desktop + toque).
- **Sprint 6 – Leads e analytics:** botão WhatsApp, formulário LGPD, eventos, e-mail de lead (Resend), painel de leads e de visualizações.
- **Sprint 7 – Qualidade e CI:** GitHub Actions em PR, proteção da `main`, testes e2e dos fluxos principais, performance mobile.
- **Sprint 8 – Editor de planta e polimento:** editor de cômodos em grade, demo final para portfólio.
