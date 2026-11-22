# Sprint 7 – Qualidade e CI

**Objetivo:** cada PR passa sozinho por todos os testes (código, banco e navegador) num banco de teste descartável, a `main` só aceita código verde, o visitante não grava mais nada direto na API (só pelo servidor) e o tour publicado abre em menos de 3 segundos no 4G.

**Não é objetivo:** funcionalidades novas para o corretor ou o visitante (Sprint 8); monitoramento pago de erros; domínio próprio (quando houver, entra o e-mail com domínio no Resend).

| # | Issue | Labels |
|---|---|---|
| 1 | [CI nos PRs: lint, tipos, testes unitários e build](sprint-7/01-ci-basico.md) | chore, infra, alta, sonnet |
| 2 | [Proteção da main: só PR com CI verde](sprint-7/02-protecao-main.md) | chore, infra, haiku |
| 3 | [Só o servidor grava leads e eventos](sprint-7/03-gravacao-pelo-servidor.md) | feature, banco, segurança, alta, opus |
| 4 | [CI com banco de teste: RLS e testes de navegador](sprint-7/04-ci-banco-local.md) | chore, infra, banco, opus |
| 5 | [Segurança do site: CSP, dependências e segredos](sprint-7/05-seguranca-site.md) | chore, infra, segurança, opus |
| 6 | [Tour publicado em menos de 3 s no 4G](sprint-7/06-desempenho-tour.md) | chore, tour, opus |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 (o CI básico protege o resto; a gravação pelo servidor muda os testes de RLS, então vem antes do CI com banco).

**Com o usuário:** ativar a proteção da `main` (issue 2, o Claude passa o comando ou o caminho na tela) e medir o tour num Android médio (issue 6).

## Próximas sprints (roteiro, a detalhar em ondas)
- **Sprint 8 – Editor de planta e polimento:** editor visual de cômodos em grade (portas e janelas), móveis simples por tipo de cômodo (cama, sofá, mesa: dão escala), outro jeito de andar (tocar no chão para ir até lá), polimento visual do painel e do tour (prédio 3D mais realista) e demo final para o portfólio. Antes, juntar a lista de melhorias do usuário.

## Depois do MVP (fases, ver `docs/01`)
- **Fase 2:** fotos 360° de cada cômodo, links por campanha com relatório, agendamento de visita, e-mail com domínio próprio, simulador, mapa.
- **Fase 3:** vídeo → 3D fotorrealista (Gaussian Splatting).
