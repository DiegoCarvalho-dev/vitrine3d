# Sprint 4 – Tour do prédio

**Objetivo:** o cliente abre o link `/e/[slug]` no celular (no ar, na Vercel), vê o prédio em 3D com cara de prédio real, colorido pelo status das unidades, filtra, corta por andar e abre a ficha da unidade, com a marca do corretor e a "Segurança da compra".

**Não é objetivo:** a unidade por dentro em 3D (Sprint 5), botão de WhatsApp, formulário de interesse e e-mail de lead (Sprint 6), CI e proteção da `main` (Sprint 7), polimento visual do painel e editor de planta (Sprint 8).

| # | Issue | Labels |
|---|---|---|
| 1 | [Deploy na Vercel com variáveis de ambiente](sprint-4/01-deploy-vercel.md) (era a #8) | chore, infra, alta, segurança, opus |
| 2 | [Página pública do empreendimento](sprint-4/02-pagina-publica.md) | feature, tour, alta, segurança, opus |
| 3 | [Prédio 3D com os dados reais](sprint-4/03-predio-3d-dados-reais.md) | feature, 3d, tour, alta, opus |
| 4 | [Visual do prédio: aparência de edifício real no 3D e na ilustração da home](sprint-4/04-visual-predio-real.md) (era a #12) | feature, 3d, tour, opus |
| 5 | [Filtros do tour](sprint-4/05-filtros.md) | feature, tour, sonnet |
| 6 | [Corte por andar e ficha da unidade](sprint-4/06-corte-andar-ficha.md) | feature, 3d, tour, opus |
| 7 | [Prévia no WhatsApp (Open Graph) e desempenho no celular](sprint-4/07-open-graph-desempenho.md) | feature, tour, sonnet |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 6 → 5 → 7. A 1 vem primeiro para o celular testar pela internet, não só pela Wi-Fi.

**Decisões desta sprint:**
- Páginas públicas leem com um cliente **anônimo** (sem cookies de login), como manda o `docs/03`: um corretor logado nunca vê o `preco` de outro.
- O visitante só vê `preco_publico` (nulo quando "sob consulta").
- Planejamento em ondas: esta sprint e a 5 estão detalhadas; as 6 a 8 só têm objetivo (ver `docs/sprints/sprint-5.md`).
