# Sprint 1 – Ambiente

**Objetivo:** deixar tudo pronto para começar a construir. Ao final, o projeto roda na sua máquina, conectado ao Supabase, com testes configurados e uma prova de conceito 3D funcionando no celular.

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
| 8 | ~~[Deploy na Vercel](sprint-1/08-deploy-vercel.md)~~ **→ Backlog, volta na Sprint 4** | chore, infra |
| 9 | [Estudo: Next.js, R3F, Supabase RLS](sprint-1/09-estudo-fundamentos.md) | estudo |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 → 7 (a 9 vai em paralelo).

**Mudança de escopo (16/11/2026):** a #8 (deploy na Vercel) saiu da Sprint 1. Nas Sprints 2 e 3 o desenvolvimento segue em `localhost`, e o teste no celular usa a rede local (`http://<ip-do-pc>:3000`). O deploy volta como primeira issue da Sprint 4, que precisa de URL pública para a prévia do link no WhatsApp (Open Graph) e para medir o carregamento no 4G.

## Próximas sprints (rascunho, a refinar)

- **Sprint 2 – Banco e login:** migrations de todas as tabelas + RLS, seed do prédio demo, login do corretor, perfil.
- **Sprint 3 – Painel:** CRUD de empreendimento, tipologias, cômodos, unidades; upload de capa.
- **Sprint 4 – Tour (prédio):** deploy na Vercel (ex-#8), página pública `/e/[slug]`, prédio 3D com dados reais e visual de edifício real (#12), filtros, corte por andar, Open Graph.
- **Sprint 5 – Tour (unidade):** planta → 3D (paredes, portas), etiquetas, vista dollhouse, modo caminhar (desktop + toque).
- **Sprint 6 – Leads e analytics:** botão WhatsApp, formulário LGPD, eventos, painel de leads e de visualizações.
- **Sprint 7 – Qualidade e CI:** GitHub Actions em PR, proteção da `main`, testes e2e dos fluxos principais, performance mobile.
- **Sprint 8 – Editor de planta e polimento:** editor de cômodos em grade, demo final para portfólio.
