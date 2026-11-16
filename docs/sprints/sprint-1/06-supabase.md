---
title: "Criar o projeto Supabase e conectar ao Next.js"
labels: "tipo:chore,area:banco,area:infra,prioridade:alta,seguranca"
---
## Contexto
Banco, login e arquivos ficarão no Supabase (plano grátis). Nesta issue só conectamos: as tabelas vêm na Sprint 2.

## O que fazer
- [ ] Criar conta e o projeto `vitrine3d-dev` no Supabase (região mais próxima: São Paulo)
- [ ] Guardar a senha do banco num gerenciador de senhas (**nunca** no repositório)
- [ ] Instalar `@supabase/supabase-js` e `@supabase/ssr`
- [ ] Criar `src/lib/supabase/client.ts` (navegador) e `src/lib/supabase/server.ts` (servidor)
- [ ] Preencher `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou a publishable key) e documentar no `.env.example` **sem valores**
- [ ] `supabase init` + `supabase link` para versionar migrations em `supabase/`
- [ ] Criar a primeira migration de teste (ex.: tabela `saude` com RLS ativo e uma linha) e aplicar com `supabase db push`
- [ ] Página `/lab/supabase` que lê essa tabela e mostra "conectado ✅"

## Critérios de aceite
- [ ] `/lab/supabase` mostra "conectado" lendo do banco
- [ ] Nenhuma chave no Git (`git grep -i "supabase.co"` só encontra `.env.example` vazio ou docs)
- [ ] `/security-review` executado

## Como testar
Abrir http://localhost:3000/lab/supabase.

## Referências
https://supabase.com/docs/guides/auth/server-side/nextjs
