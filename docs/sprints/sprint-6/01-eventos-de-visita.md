---
title: "Registrar as visitas do tour (eventos)"
labels: "tipo:feature,area:tour,area:banco,seguranca,prioridade:alta,modelo:opus"
---
## Contexto
Para o corretor saber quem olhou o quê (e para o e-mail do lead e o termômetro de interesse), o tour precisa registrar as visitas. A tabela `eventos` e o RLS (visitante só insere, nunca lê) já existem desde a Sprint 2 (`docs/03`).

## O que fazer
- [ ] Id anônimo da sessão no navegador (`sessao_id`, formato fixo, sem dado pessoal), guardado no `localStorage` (sem cookie de rastreio)
- [ ] Registrar: abriu o tour, abriu a unidade, viu um cômodo (etiqueta ou lista), entrou no modo caminhar (em `dados`) e o tempo na página (ao sair, `sendBeacon`)
- [ ] Envio por uma rota do servidor com Zod (tipos de evento conhecidos, `dados` pequeno) e o cliente anônimo; só para empreendimento publicado
- [ ] Limite contra abuso: no máximo N eventos por sessão por minuto (simples, no servidor) e nada de evento repetido em sequência
- [ ] Aviso curto de privacidade no rodapé do tour ("registramos as páginas vistas, sem dados pessoais")
- [ ] Testes: unitários da validação; `test:rls` continua passando; e2e de que abrir o tour e a unidade grava os eventos

## Arquivos envolvidos
`src/app/api/eventos/route.ts`, `src/lib/tour/events.ts`, `src/app/e/[slug]/*`

## Critérios de aceite
- [ ] Eventos gravados com o empreendimento, a unidade e o cômodo certos
- [ ] Evento de empreendimento não publicado ou com dados inválidos é recusado
- [ ] O tour continua rápido (envio em segundo plano, sem travar a tela)

## Como testar
Abrir o tour, entrar numa unidade, tocar em cômodos e conferir os eventos no banco (`supabase db query`).
