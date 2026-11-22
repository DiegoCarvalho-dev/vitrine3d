---
title: "Tour publicado em menos de 3 s no 4G"
labels: "tipo:chore,area:tour,modelo:opus"
---
## Contexto
A meta do MVP é o tour abrir em menos de 3 s no 4G. Na Sprint 4 o maior elemento (a capa) ficou em 3,2 s, e a maior parte do tempo era o servidor consultando o banco a cada visita (#47). As páginas públicas mudam pouco: dá para guardar o resultado e atualizar quando o corretor salvar.

## O que fazer
- [ ] Cache das páginas públicas (prédio e unidade) com atualização quando o corretor salva o empreendimento, as unidades ou a planta (revalidação por empreendimento)
- [ ] Capa em tamanho certo para o celular (versão menor da imagem) e pré-carregada
- [ ] Medir com Lighthouse (celular, 4G simulado) antes e depois, no site publicado, e registrar na issue
- [ ] Medir o modo caminhar num Android médio (com o usuário) e ajustar a qualidade automática se precisar
- [ ] Conferir que preço "sob consulta" e empreendimento arquivado nunca ficam num cache antigo (testes)

## Arquivos envolvidos
`src/app/e/[slug]/*`, `src/lib/tour/queries.ts`, ações do painel que salvam dados, `src/components/image-upload.tsx`

## Critérios de aceite
- [ ] Lighthouse (celular): maior elemento em menos de 3 s no 4G simulado
- [ ] Mudança salva no painel aparece no tour em poucos segundos
- [ ] Modo caminhar fluido num Android médio

## Como testar
Rodar o Lighthouse no tour publicado (modo celular) e, no painel, mudar o preço de uma unidade e ver o tour atualizado.
