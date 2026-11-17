---
title: "Unidades: grade do prédio, preço e status"
labels: "tipo:feature,area:painel,prioridade:alta,seguranca"
---
## Contexto
Um prédio de 10 andares × 4 tem 40 unidades. Cadastrar uma a uma inviabiliza a meta de 20 minutos, então o painel gera a grade inteira e o corretor só ajusta o que muda. O preço "sob consulta" precisa ser fácil de entender, porque é uma decisão comercial.

## O que fazer
- [ ] Botão "Gerar unidades": cria andares × unidades por andar com numeração (101, 102…), sem duplicar as existentes
- [ ] Tabela por andar (mais alto em cima, como o prédio), com tipologia, preço, "mostrar preço" e status editáveis
- [ ] Edição em massa: selecionar várias unidades (ou uma coluna inteira, ex.: todas as finais 01) e aplicar tipologia, preço, status ou "sob consulta"
- [ ] Preço com máscara de moeda (R$) e status com as cores do tema (disponível, reservado, vendido)
- [ ] Mini prédio colorido por status (o SVG da home, agora com os dados reais) como resumo
- [ ] Server Actions em lote com `requireUserId` e Zod (limite de unidades por requisição)
- [ ] Testes: unitários (numeração, preço em reais → número); e2e de gerar 40 unidades, aplicar tipologia por coluna e marcar "sob consulta"; `npm run test:rls` continua passando

## Arquivos envolvidos
`src/app/(painel)/painel/empreendimentos/[id]/unidades/*`, `src/lib/validacoes/unidade.ts`, `src/components/building-illustration.tsx`, `tests/unidades.spec.ts`

## Critérios de aceite
- [ ] Gerar unidades duas vezes não duplica nada
- [ ] Aplicar a tipologia "Tipo B" em todas as finais 01 e 04 leva poucos cliques
- [ ] Unidade "sob consulta" continua sem preço para o visitante (já garantido pelo banco; conferir pela API pública)
- [ ] Funciona no celular (390 px): tabela com rolagem horizontal ou cartões por andar
- [ ] `/security-review` executado

## Como testar
No "Edifício Teste", gerar as unidades, aplicar tipologias por coluna, definir preços, marcar as coberturas como "sob consulta" e conferir o mini prédio colorido.
