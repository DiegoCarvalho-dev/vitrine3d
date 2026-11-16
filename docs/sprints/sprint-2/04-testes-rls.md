---
title: "Testes automatizados de RLS"
labels: "tipo:chore,area:banco,prioridade:alta,seguranca"
---
## Contexto
O RLS é a única coisa entre a chave pública (que está no navegador) e os dados dos corretores. Testar à mão com `curl` não escala: cada migration nova pode abrir uma brecha sem ninguém perceber. Esta issue transforma os cenários das issues 1 a 3 em testes que rodam com um comando.

## O que fazer
- [ ] Testes de integração com Vitest em `tests/rls/`, rodando contra o projeto `vitrine3d-dev` (sem Docker)
- [ ] Dois corretores de teste (A e B) e um visitante anônimo; os usuários de teste são criados e apagados pelos próprios testes
- [ ] A chave usada para criar/apagar usuários de teste fica **só** em `.env.test.local` (nunca `NEXT_PUBLIC_`, nunca no Git); documentar em `.env.example`
- [ ] Cenários mínimos:
  - A vê e edita os seus empreendimentos; B não vê os rascunhos de A
  - A não consegue mudar o `dono_id` para B
  - visitante: só lê publicado; recebe erro ao pedir `unidades.preco`; recebe `preco_publico = null` quando "sob consulta"
  - visitante insere lead com consentimento e não consegue lê-lo; lead sem consentimento é recusado
  - B não vê leads nem eventos de A
- [ ] Script `npm run test:rls` (separado do `npm run test`, porque precisa de rede e do `.env.test.local`)

## Arquivos envolvidos
`tests/rls/*.test.ts`, `vitest.rls.config.mts`, `package.json`, `.env.example`, `docs/04-fluxo-de-trabalho.md` (incluir `test:rls` quando mexer em banco)

## Critérios de aceite
- [ ] `npm run test:rls` passa com todos os cenários acima
- [ ] Os testes não deixam usuários ou dados de teste para trás
- [ ] Nenhuma chave secreta no Git (`git grep sb_secret_` vazio)
- [ ] `/security-review` executado

## Como testar
```bash
npm run test:rls
```
Depois, quebrar de propósito uma policy numa branch local (sem aplicar no banco compartilhado sem combinar) e ver o teste falhar.
