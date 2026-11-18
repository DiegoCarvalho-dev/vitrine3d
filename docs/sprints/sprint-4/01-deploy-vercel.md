---
title: "Deploy na Vercel com variáveis de ambiente"
labels: "tipo:chore,area:infra,prioridade:alta,seguranca,modelo:opus"
---
## Contexto
Até aqui tudo roda em `localhost`. Com o site no ar, o celular testa pela internet (4G de verdade) e o link pode ser mandado no WhatsApp. Plano gratuito da Vercel.

## O que fazer
- [ ] Projeto na Vercel ligado ao GitHub (deploy automático da `main` e prévia por PR)
- [ ] Variáveis de ambiente só as públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); nenhuma chave secreta
- [ ] Supabase Auth: `site_url` e URLs de redirecionamento com o domínio `*.vercel.app` (e `localhost` continua)
- [ ] Região das funções perto de São Paulo (`gru1`) para falar rápido com o banco
- [ ] Cabeçalhos de segurança básicos (`X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`)
- [ ] README: link do site no ar e como o deploy funciona

## Arquivos envolvidos
`vercel.json` ou `next.config.ts`, `supabase/config.toml`, `README.md`, `.env.example`

## Critérios de aceite
- [ ] Site no ar com login, painel e cadastro funcionando
- [ ] Nenhuma chave secreta no navegador nem no repositório
- [ ] Cadastro e login funcionam no domínio da Vercel
- [ ] `/security-review` executado

## Como testar
Abrir o link no celular pelo 4G, criar conta, entrar e abrir o painel.
