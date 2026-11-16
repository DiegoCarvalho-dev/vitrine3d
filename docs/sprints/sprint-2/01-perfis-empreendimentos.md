---
title: "Banco: perfis, empreendimentos e tipos gerados"
labels: "tipo:feature,area:banco,prioridade:alta,seguranca"
---
## Contexto
Base de tudo: o corretor (`perfis`) e o que ele vende (`empreendimentos`), conforme `docs/03-modelagem-de-dados.md`. É a primeira migration "de verdade" do produto.

## O que fazer
- [ ] Migration com os enums `tipo_empreendimento` e `status_publicacao`
- [ ] Tabela `perfis` (`id` = `auth.users.id`, `on delete cascade`) e trigger que cria o perfil automaticamente quando um usuário se cadastra
- [ ] Tabela `empreendimentos` com `slug` único (só `a-z0-9-`, check constraint), `uf` com 2 letras e campos de "segurança da compra" (`construtora`, `registro_incorporacao`, `previsao_entrega`, `informacoes_conferidas_em`)
- [ ] Trigger genérico `atualizado_em` (reutilizado pelas próximas tabelas)
- [ ] RLS + `GRANT` explícito + policies:
  - `perfis`: dono lê e edita o próprio (UPDATE com `using` **e** `with check`)
  - `perfis` para visitante: só as colunas públicas (GRANT por coluna) e só de quem tem empreendimento publicado
  - `empreendimentos`: dono faz CRUD dos seus; visitante lê só `status = 'publicado'`
- [ ] Índice único em `empreendimentos(slug)`
- [ ] Script `npm run db:types` (`supabase gen types typescript --linked > src/types/database.ts`) e tipos gerados commitados
- [ ] `supabase db advisors --remote` sem avisos

## Arquivos envolvidos
`supabase/migrations/*_perfis_empreendimentos.sql`, `src/types/database.ts`, `package.json`, `docs/03-modelagem-de-dados.md` (se algo mudar)

## Critérios de aceite
- [ ] Ao criar um usuário (painel do Supabase > Authentication), a linha em `perfis` aparece sozinha
- [ ] Com a chave pública, o visitante não lê empreendimento em `rascunho` e não lê `perfis.notificar_leads_email`
- [ ] Um corretor não consegue alterar o `dono_id` de um empreendimento para outro corretor
- [ ] Advisors sem avisos; tipos gerados sem erro no `npm run typecheck`

## Como testar
```bash
supabase db push --remote
```
```bash
npm run db:types && npm run typecheck
```
Os testes automatizados de RLS chegam na issue 4; aqui, testar os cenários acima com `curl` usando a chave pública (como na #6).
