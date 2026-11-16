---
title: "Perfil do corretor"
labels: "tipo:feature,area:painel,seguranca"
---
## Contexto
O tour mostra o corretor (nome, WhatsApp, CRECI, cor da marca). O WhatsApp vira o botão com mensagem pronta na Sprint 6, então precisa estar num formato confiável (E.164: `+5511999999999`).

## O que fazer
- [ ] Página `/painel/perfil` com formulário (shadcn/ui + react-hook-form): nome, WhatsApp, CRECI, cor da marca, receber e-mail de novos leads
- [ ] Esquema Zod compartilhado entre cliente e servidor (`src/lib/validacoes/perfil.ts`):
  - WhatsApp: aceita o que o corretor digitar ("(11) 99999-9999") e salva em E.164
  - CRECI: formato livre com limite de tamanho
  - cor: hex `#RRGGBB`
- [ ] Server Action que salva só o perfil do usuário logado (o `id` vem da sessão, nunca do formulário)
- [ ] Prévia da cor da marca e aviso de sucesso (toast)
- [ ] Testes: unitários do esquema (inclusive normalização do WhatsApp) e e2e de editar e salvar

## Arquivos envolvidos
`src/app/(painel)/painel/perfil/*`, `src/lib/validacoes/perfil.ts`, `src/lib/validacoes/perfil.test.ts`, `tests/perfil.spec.ts`

## Critérios de aceite
- [ ] O corretor edita e salva o perfil; recarregando a página, os dados continuam lá
- [ ] WhatsApp inválido mostra erro no campo; válido é salvo em E.164
- [ ] Mandar outro `id` na requisição não altera o perfil de outra pessoa
- [ ] Funciona no celular (390 px) e sem erros no console
- [ ] `/security-review` executado

## Como testar
Entrar no painel, abrir http://localhost:3000/painel/perfil, preencher, salvar e recarregar.
Foto e logo do corretor ficam para a Sprint 3 (Storage).
