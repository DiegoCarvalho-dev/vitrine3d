---
title: "Fluxo completo em menos de 20 minutos"
labels: "tipo:chore,area:painel"
---
## Contexto
Métrica do MVP (`docs/01`): "um corretor consegue cadastrar um prédio com 1 tipologia em menos de 20 minutos". Esta issue fecha a sprint medindo isso de ponta a ponta e corrigindo o que atrapalhar.

## O que fazer
- [ ] Teste e2e do fluxo inteiro: criar conta → perfil → criar prédio → capa → tipologia com cômodos → gerar unidades → preços e status → publicar
- [ ] Cronometrar o fluxo manualmente (o usuário faz, com um prédio fictício novo) e anotar onde travou
- [ ] Corrigir os atritos encontrados (textos, ordem dos campos, valores padrão, navegação entre seções)
- [ ] Revisão de acessibilidade básica do painel (foco visível, rótulos, contraste, navegação por teclado)
- [ ] Atualizar o `README` (status) e o `CLAUDE.md` ("Onde estamos")

## Arquivos envolvidos
`tests/fluxo-painel.spec.ts`, arquivos do painel conforme os ajustes, `README.md`, `CLAUDE.md`

## Critérios de aceite
- [ ] O e2e do fluxo completo passa em desktop e celular
- [ ] O cadastro manual de um prédio com 1 tipologia leva menos de 20 minutos
- [ ] Nenhum erro no console durante o fluxo

## Como testar
Cronometrar o cadastro de um prédio novo do zero, sem ajuda, e registrar o tempo nesta issue.
