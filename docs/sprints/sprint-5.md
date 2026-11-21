# Sprint 5 – Tour da unidade

**Objetivo:** da ficha da unidade, o cliente entra no apartamento em 3D: vê a planta de cima com os cômodos identificados e caminha por dentro (teclado e mouse no computador, toque no celular), com link próprio para cada unidade.

**Não é objetivo:** fotos 360° e hotspots com fotos (Fase 2), portas e janelas desenhadas à mão (vêm com o editor da Sprint 8), leads (Sprint 6).

| # | Issue | Labels |
|---|---|---|
| 1 | [Planta em 3D: paredes a partir dos cômodos](sprint-5/01-planta-3d-paredes.md) | feature, 3d, tour, alta, opus |
| 2 | [Portas automáticas entre cômodos vizinhos](sprint-5/02-portas-automaticas.md) | feature, 3d, opus |
| 3 | [Vista de cima com etiquetas dos cômodos](sprint-5/03-vista-de-cima-etiquetas.md) | feature, 3d, tour, opus |
| 4 | [Modo caminhar no desktop e no celular](sprint-5/04-modo-caminhar.md) | feature, 3d, tour, opus |
| 5 | [Do prédio para a unidade e de volta, com link próprio](sprint-5/05-navegacao-unidade.md) | feature, tour, sonnet |
| 6 | [Desempenho e qualidade do 3D no celular](sprint-5/06-desempenho-3d.md) | chore, 3d, opus |

**Ordem sugerida:** 1 → 2 → 3 → 5 → 4 → 6.

## Próximas sprints (roteiro, a detalhar em ondas)
- **Sprint 6 – Leads e analytics:** botão WhatsApp com mensagem pronta, formulário com consentimento LGPD, eventos de visita, e-mail ao corretor a cada lead (Resend), painel de leads e visualizações com resumo do mês; rate limit e dados do visitante sempre como texto.
- **Sprint 7 – Qualidade e CI:** GitHub Actions nos PRs (lint, typecheck, testes, build), proteção da `main`, e2e dos fluxos principais, desempenho no celular.
- **Sprint 8 – Editor de planta e polimento:** editor visual de cômodos em grade (portas e janelas), polimento visual do painel (textos de ajuda e ordem dos passos, do teste cronometrado da #34), **polimento visual do tour** (prédio 3D mais realista: materiais, guarda-corpos, entorno com calçada e árvores; página pública — feedback do usuário no teste da Sprint 4: "o prédio 3D está feio comparado à ilustração da home") e demo final para o portfólio. Antes, juntar a lista de melhorias do usuário.

## Depois do MVP (fases, ver `docs/01`)
- **Fase 2:** fotos 360° de cada cômodo (o dono/corretor fotografa; o cliente "olha em volta" dentro do cômodo real), links por campanha, simulador, mapa.
- **Fase 3:** vídeo → 3D fotorrealista (Gaussian Splatting), com móveis e paredes reais. É a visão do usuário de "entrar na unidade e ver tudo em 3D com o que o dono fotografou".
- No MVP (Sprint 5), a unidade em 3D vem da planta cadastrada (paredes, portas, piso, etiquetas), sem móveis nem fotos. Opção em aberto: móveis simples por tipo de cômodo na Sprint 5.
