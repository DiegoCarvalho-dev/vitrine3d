---
title: "Testes automatizados de RLS"
labels: "tipo:chore,area:banco,prioridade:alta,seguranca"
---
## Contexto
O RLS é a única coisa entre a chave pública (que está no navegador) e os dados dos corretores. Testar à mão com `curl` não escala: cada migration nova pode abrir uma brecha sem ninguém perceber.

**Mudança de abordagem (aprovada em 16/11/2026):** o plano original previa testes em Vitest pela API, com usuários reais criados por uma chave secreta guardada em `.env.test.local`. Durante as issues #13 a #15 os testes nasceram **em SQL**, dentro do próprio banco: cada arquivo cria os usuários, troca de papel (`anon`, `authenticated` com o `sub` de cada corretor) e termina com um erro proposital que **desfaz a transação**. Assim os testes não deixam dados e **não precisam de chave secreta**. Esta issue consolida essa abordagem.

## O que fazer
- [x] Testes em SQL em `supabase/tests/rls/`, rodando contra o projeto `vitrine3d-dev` (sem Docker), numa transação desfeita no fim
- [x] Corretores de teste (A, B, C) e visitante anônimo criados dentro do próprio teste, sem chave secreta
- [x] Cenários mínimos:
  - A vê e edita os seus empreendimentos; B não vê os rascunhos de A
  - A não consegue mudar o `dono_id` para B
  - visitante: só lê publicado; recebe erro ao pedir `unidades.preco`; recebe `preco_publico = null` quando "sob consulta"
  - visitante insere lead com consentimento e não consegue lê-lo; lead sem consentimento é recusado
  - B não vê leads nem eventos de A
- [x] Script `npm run test:rls` (`supabase/tests/rls/rodar.mjs`), que só aprova com o resumo completo (a CLI corta mensagens longas)
- [x] Cenários que faltavam: empreendimento arquivado, perfil de quem só tem rascunho/arquivado e exclusão da conta em cascata (`04_ciclo_de_vida.sql`)
- [x] Seção "Testes" no `README.md`, explicando o `test:rls`

## Arquivos envolvidos
`supabase/tests/rls/*.sql`, `supabase/tests/rls/rodar.mjs`, `package.json`, `README.md`, `docs/04-fluxo-de-trabalho.md`

## Critérios de aceite
- [x] `npm run test:rls` passa com todos os cenários acima
- [x] Os testes não deixam usuários ou dados de teste para trás
- [x] Nenhuma chave secreta no Git (`git grep sb_secret_` vazio)
- [x] `/security-review` executado

## Como testar
```bash
npm run test:rls
```
Para ver um teste falhar: copie um cenário de `supabase/tests/rls/` para um arquivo novo trocando o resultado esperado e rode de novo (apague o arquivo depois).
