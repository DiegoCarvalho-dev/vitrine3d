---
title: "Do prédio para a unidade e de volta, com link próprio"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
Da ficha da unidade (Sprint 4) o cliente entra no apartamento. Cada unidade ganha um link para o corretor mandar direto ("olha a 902").

## O que fazer
- [ ] Rota `/e/[slug]/u/[numero]` (cliente anônimo; 404 se a unidade ou o empreendimento não estiverem publicados)
- [ ] Botão "ver por dentro" na ficha e "voltar ao prédio" na unidade, mantendo os filtros
- [ ] Unidade sem tipologia ou sem cômodos: mensagem clara em vez do 3D
- [ ] Metadados Open Graph da unidade (número, tipologia, preço só se público)
- [ ] Testes: e2e de ir e voltar; 404 de unidade inexistente

## Arquivos envolvidos
`src/app/e/[slug]/u/[numero]/*`, `tests/tour-unidade.spec.ts`

## Critérios de aceite
- [ ] Link da unidade abre direto nela, no celular
- [ ] "Sob consulta" continua sem preço nos metadados

## Como testar
Mandar o link da 902 para você mesmo no WhatsApp e abrir no celular.
