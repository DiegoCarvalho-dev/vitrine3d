# Sprint 6 – Leads e analytics

**Objetivo:** a visita vira contato: o cliente chama o corretor no WhatsApp ou deixa seus dados com consentimento LGPD, o corretor recebe um e-mail na hora com o que a pessoa viu e acompanha no painel os leads (com termômetro de interesse) e as visitas do mês.

**Não é objetivo:** links por campanha com relatório próprio, agendamento de visita e CRM completo (Fase 2); envio de WhatsApp automático pelo sistema (o visitante é quem chama); testes no GitHub Actions (Sprint 7).

| # | Issue | Labels |
|---|---|---|
| 1 | [Registrar as visitas do tour (eventos)](sprint-6/01-eventos-de-visita.md) | feature, tour, banco, segurança, alta, opus |
| 2 | [Botão WhatsApp com mensagem pronta](sprint-6/02-botao-whatsapp.md) | feature, tour, sonnet |
| 3 | [Formulário de interesse com consentimento LGPD](sprint-6/03-formulario-interesse.md) | feature, tour, segurança, alta, opus |
| 4 | [E-mail ao corretor a cada lead novo](sprint-6/04-email-novo-lead.md) | feature, infra, segurança, opus |
| 5 | [Painel de leads](sprint-6/05-painel-leads.md) | feature, painel, sonnet |
| 6 | [Visitas e resumo do mês no painel](sprint-6/06-visitas-resumo.md) | feature, painel, sonnet |
| 7 | [Termômetro de interesse do lead](sprint-6/07-termometro-interesse.md) | feature, painel, sonnet |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 → 7 (o 1 alimenta o 4, o 6 e o 7; o 3 alimenta o 4 e o 5).

**Antes da issue 4:** o usuário cria uma conta gratuita no Resend e gera a chave da API (o Claude explica o passo a passo); a chave vai só no `.env.local` e nas variáveis da Vercel.

## Próximas sprints (roteiro, a detalhar em ondas)
- **Sprint 7 – Qualidade e CI:** GitHub Actions nos PRs (lint, typecheck, testes, build), proteção da `main`, e2e dos fluxos principais (prédio → unidade → lead), revisão de segurança dos formulários públicos (inclui tirar o INSERT direto do visitante em `leads` e `eventos`: gravar só pelo servidor, fechando o spam pela API crua), medição num Android médio.
- **Sprint 8 – Editor de planta e polimento:** editor visual de cômodos em grade (portas e janelas), móveis simples por tipo de cômodo (cama, sofá, mesa: dão escala), outro jeito de andar (tocar no chão para ir até lá), polimento visual do painel e do tour (prédio 3D mais realista) e demo final para o portfólio. Antes, juntar a lista de melhorias do usuário.

## Depois do MVP (fases, ver `docs/01`)
- **Fase 2:** fotos 360° de cada cômodo, links por campanha com relatório, agendamento de visita, simulador, mapa.
- **Fase 3:** vídeo → 3D fotorrealista (Gaussian Splatting).
