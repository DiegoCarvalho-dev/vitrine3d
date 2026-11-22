---
title: "Painel de leads"
labels: "tipo:feature,area:painel,modelo:sonnet"
---
## Contexto
Com os leads chegando, o corretor precisa de um lugar para ver, acompanhar e atender cada um.

## O que fazer
- [ ] Página `/painel/leads`: lista dos leads (mais novos primeiro), com nome, contato, empreendimento, unidade, origem e data; filtro por empreendimento e por status
- [ ] Mudar o status (novo → em contato → visita agendada → ganho / perdido)
- [ ] Ações rápidas: abrir o WhatsApp do lead com mensagem pronta, copiar o e-mail
- [ ] Detalhe do lead com a mensagem e o resumo da navegação (eventos da sessão)
- [ ] Apagar a pedido do cliente (LGPD), com confirmação
- [ ] Contador de leads novos no menu do painel
- [ ] Testes: e2e de ver, mudar status e apagar (com axe); `test:rls` (corretor só vê os seus)

## Arquivos envolvidos
`src/app/(painel)/painel/leads/*`, `src/lib/leads/*`

## Critérios de aceite
- [ ] O corretor nunca vê leads de outro corretor
- [ ] Funciona bem no celular (lista legível, ações com o polegar)

## Como testar
Enviar dois leads pelo tour e atendê-los pelo painel no celular.
