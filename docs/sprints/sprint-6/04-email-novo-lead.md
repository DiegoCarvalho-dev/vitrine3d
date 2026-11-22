---
title: "E-mail ao corretor a cada lead novo"
labels: "tipo:feature,area:infra,seguranca,modelo:opus"
---
## Contexto
Lead esfria quando a resposta demora (`docs/05`, D4). O corretor recebe um e-mail na hora, com o contato e o que a pessoa viu, para responder primeiro aos mais interessados.

## O que fazer
- [ ] Conta no Resend (o usuário cria; o Claude explica) e `RESEND_API_KEY` só no servidor (`.env.local`, Vercel); validação no `src/lib/env.ts` e item no `.env.example`
- [ ] Ao salvar o lead (issue 3), enviar o e-mail sem atrasar a resposta ao visitante (`after()` do Next)
- [ ] Conteúdo: nome, telefone/e-mail, unidade, mensagem e o resumo da sessão (unidades e cômodos vistos, tempo no tour, se caminhou), com botões "Responder no WhatsApp" e "Abrir no painel"
- [ ] Respeitar `perfis.notificar_leads_email` (opção no perfil para desligar)
- [ ] Texto do visitante sempre escapado; nada de dados de outros corretores
- [ ] Falha no envio não perde o lead (fica no painel) e é registrada no log do servidor
- [ ] Testes: unitário do conteúdo do e-mail (com o resumo); e2e com o envio simulado

## Arquivos envolvidos
`src/lib/email/*`, `src/lib/env.ts`, `src/app/e/[slug]/actions.ts`, `src/app/(painel)/painel/perfil/*`

## Critérios de aceite
- [ ] O e-mail chega em até 1 minuto depois do envio do formulário
- [ ] Desligando a opção no perfil, não chega e-mail
- [ ] A chave do Resend nunca vai para o navegador

## Como testar
Enviar um lead pelo celular e ver o e-mail chegar no e-mail do corretor.
