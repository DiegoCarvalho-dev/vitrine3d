# Sprint 1 – Ambiente

**Objetivo:** deixar tudo pronto para começar a construir. Ao final, o projeto roda na sua máquina e na internet, conectado ao Supabase, com testes configurados e uma prova de conceito 3D funcionando no celular.

**Não é objetivo:** funcionalidades do produto (cadastro, tour, leads). Isso começa na Sprint 2.

| # | Issue | Labels |
|---|---|---|
| 1 | [Instalar e configurar as ferramentas](sprint-1/01-instalar-ferramentas.md) | chore, infra, alta |
| 2 | [Repositório, quadro, labels e milestone](sprint-1/02-repositorio-github.md) | chore, infra, alta |
| 3 | [Projeto Next.js + TS + Tailwind + ESLint + Prettier](sprint-1/03-criar-projeto-nextjs.md) | chore, infra, alta |
| 4 | [shadcn/ui, fontes e tema](sprint-1/04-shadcn-ui.md) | chore, painel |
| 5 | [Testes: Vitest + Playwright](sprint-1/05-testes.md) | chore, infra |
| 6 | [Supabase conectado](sprint-1/06-supabase.md) | chore, banco, infra, alta, segurança |
| 7 | [Prova de conceito 3D (prédio de caixas)](sprint-1/07-poc-3d.md) | feature, 3d, alta |
| 8 | [Deploy na Vercel](sprint-1/08-deploy-vercel.md) | chore, infra |
| 9 | [Estudo: Next.js, R3F, Supabase RLS](sprint-1/09-estudo-fundamentos.md) | estudo |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (a 9 vai em paralelo).

## Próximas sprints (rascunho, a refinar)

- **Sprint 2 – Banco e login:** migrations de todas as tabelas + RLS, seed do prédio demo, login do corretor, perfil.
- **Sprint 3 – Painel:** CRUD de empreendimento, tipologias, cômodos, unidades; upload de capa.
- **Sprint 4 – Tour (prédio):** página pública `/e/[slug]`, prédio 3D com dados reais, filtros, corte por andar, Open Graph.
- **Sprint 5 – Tour (unidade):** planta → 3D (paredes, portas), etiquetas, vista dollhouse, modo caminhar (desktop + toque).
- **Sprint 6 – Leads e analytics:** botão WhatsApp, formulário LGPD, eventos, painel de leads e de visualizações.
- **Sprint 7 – Qualidade e CI:** GitHub Actions em PR, proteção da `main`, testes e2e dos fluxos principais, performance mobile.
- **Sprint 8 – Editor de planta e polimento:** editor de cômodos em grade, demo final para portfólio.
