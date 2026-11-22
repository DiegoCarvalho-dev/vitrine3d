---
title: "Formulário de interesse com consentimento LGPD"
labels: "tipo:feature,area:tour,seguranca,prioridade:alta,modelo:opus"
---
## Contexto
Nem todo cliente quer chamar no WhatsApp na hora. O formulário capta nome e contato com consentimento registrado (LGPD), ligado à unidade que a pessoa estava vendo. A tabela `leads` e o RLS (visitante só insere) já existem.

## O que fazer
- [ ] Formulário "Tenho interesse": nome, telefone e/ou e-mail (pelo menos um), mensagem opcional, unidade de interesse já preenchida
- [ ] Caixa de consentimento obrigatória com texto claro (quem recebe os dados e para quê) e link para a política de privacidade
- [ ] Página `/privacidade` simples (o que é coletado, por quanto tempo, como pedir a exclusão)
- [ ] Server Action com Zod (mesmas regras no cliente), cliente anônimo, `origem` do `?utm_source` do link
- [ ] Anti-spam: campo isca (honeypot), tempo mínimo de preenchimento e limite por sessão; mensagens de erro sem vazar detalhes
- [ ] Depois de enviar: confirmação com o próximo passo ("o corretor vai te chamar") e o botão WhatsApp; evento `enviou_lead`
- [ ] Testes: unitários do schema; e2e de enviar (desktop e celular) com axe; `test:rls` cobrindo o insert do visitante

## Arquivos envolvidos
`src/lib/validacoes/lead.ts`, `src/app/e/[slug]/lead-form.tsx`, `src/app/e/[slug]/actions.ts`, `src/app/privacidade/page.tsx`

## Critérios de aceite
- [ ] Lead sem consentimento ou sem contato é recusado (no cliente e no servidor)
- [ ] O visitante nunca consegue ler leads (nem o próprio)
- [ ] Texto digitado aparece sempre como texto (nunca HTML) no painel e no e-mail

## Como testar
No celular, enviar o formulário de uma unidade e ver o lead chegar no banco; tentar enviar sem marcar o consentimento.
