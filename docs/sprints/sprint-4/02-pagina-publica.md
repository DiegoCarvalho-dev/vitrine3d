---
title: "Página pública do empreendimento"
labels: "tipo:feature,area:tour,prioridade:alta,seguranca,modelo:opus"
---
## Contexto
É o link que o corretor manda no WhatsApp. Sem login, rápido no celular e só com o que foi publicado.

## O que fazer
- [ ] `/e/[slug]` com um cliente Supabase **anônimo** (sem cookies), mesmo se quem abre estiver logado
- [ ] Só empreendimento `publicado`; rascunho, arquivado ou slug inexistente dão 404
- [ ] Topo com capa, nome, cidade/UF e descrição; marca do corretor (foto, logo, cor, CRECI)
- [ ] Seção "Segurança da compra" (construtora, registro, entrega ou "pronto para morar") e "informações conferidas em"
- [ ] Lugar reservado para o prédio 3D (issue 3) e resumo de disponíveis/reservadas/vendidas
- [ ] Preço só de `preco_publico` ("sob consulta" quando nulo); nunca `preco`
- [ ] Testes: e2e (publicado abre, rascunho dá 404, sob consulta sem preço) e unitário do formato dos dados

## Arquivos envolvidos
`src/app/e/[slug]/*`, `src/lib/supabase/anon.ts`, `src/lib/tour/*`, `tests/tour.spec.ts`

## Critérios de aceite
- [ ] Abre sem login, no celular (390 px), sem erros no console
- [ ] Logado como outro corretor, a página continua sem `preco` de "sob consulta"
- [ ] Rascunho e arquivado não aparecem
- [ ] `/security-review` executado

## Como testar
Publicar o "Residencial Casa Nova", abrir `/e/<slug>` numa janela anônima e no celular; arquivar e conferir o 404.
