---
title: "Login do corretor (e-mail e senha)"
labels: "tipo:feature,area:painel,prioridade:alta,seguranca"
---
## Contexto
O corretor precisa de uma conta para cadastrar empreendimentos e ver leads. Usamos o Supabase Auth com sessão em cookies (SSR). Link mágico fica para depois (limite de e-mails do SMTP grátis).

## O que fazer
- [ ] `src/proxy.ts` + `src/lib/supabase/proxy.ts` (baseados no exemplo oficial): renovam a sessão a cada requisição e mandam para `/entrar` quem tenta abrir `/painel` sem login
- [ ] Páginas `/entrar` e `/cadastro` (shadcn/ui), com mensagens de erro claras em português
- [ ] Server Actions de entrar, cadastrar e sair, com validação Zod **no cliente e no servidor** (e-mail, senha com mínimo de 8 caracteres)
- [ ] `/painel` protegido, com layout simples (nome do corretor e botão "Sair")
- [ ] No servidor, checar o usuário com `getClaims()`/`getUser()`, nunca com `getSession()`
- [ ] Projeto `vitrine3d-dev`: confirmação de e-mail desligada (documentar o passo no painel do Supabase e o que muda antes de ter clientes)
- [ ] Testes: unitários dos esquemas Zod; e2e de cadastro → painel → sair → painel bloqueado

## Arquivos envolvidos
`src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/app/(auth)/entrar/*`, `src/app/(auth)/cadastro/*`, `src/app/(painel)/painel/*`, `src/lib/validacoes/auth.ts`, `tests/auth.spec.ts`

## Critérios de aceite
- [ ] Cadastro com e-mail e senha leva ao `/painel`
- [ ] `/painel` sem login redireciona para `/entrar`
- [ ] "Sair" encerra a sessão e o `/painel` volta a ficar bloqueado
- [ ] Senha errada mostra mensagem clara, sem dizer se o e-mail existe
- [ ] Funciona no celular (390 px) e sem erros no console
- [ ] `/security-review` executado

## Como testar
Abrir http://localhost:3000/cadastro, criar uma conta, entrar no painel, sair e tentar abrir http://localhost:3000/painel de novo.
