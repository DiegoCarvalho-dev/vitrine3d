---
title: "Banco: tipologias, cômodos e unidades (com preço oculto)"
labels: "tipo:feature,area:banco,prioridade:alta,seguranca"
---
## Contexto
Tipologia é a planta que se repete ("Tipo A, 2 quartos, 65 m²"); cômodos são as partes dela, com geometria; unidade é o apartamento concreto (902) com preço e status. O preço pode ser "sob consulta" e **nunca** pode chegar ao visitante nesse caso.

## O que fazer
- [ ] Enums `tipo_comodo` e `status_unidade`
- [ ] Tabelas `tipologias`, `comodos` e `unidades` com `on delete cascade` a partir do empreendimento
- [ ] `unidades`: únicos `(empreendimento_id, numero)` e `(empreendimento_id, andar, posicao_no_andar)`; `andar >= 0`; `preco >= 0`
- [ ] Trigger: a tipologia da unidade precisa ser do **mesmo** empreendimento
- [ ] **Preço oculto:** coluna gerada `preco_publico` (`preco` se `exibir_preco`, senão `null`) e GRANT por coluna (visitante lê `preco_publico`, nunca `preco`)
- [ ] RLS + GRANT + policies: dono faz CRUD se o empreendimento é dele; visitante lê se o empreendimento está publicado
- [ ] Índices: `unidades(empreendimento_id, status)` e índices nas FKs
- [ ] Trigger `atualizado_em` onde fizer sentido
- [ ] Atualizar `docs/03` (troca da view `unidades_publicas` pela coluna gerada, com o motivo) e regenerar os tipos
- [ ] `supabase db advisors --remote` sem avisos

## Arquivos envolvidos
`supabase/migrations/*_tipologias_comodos_unidades.sql`, `src/types/database.ts`, `docs/03-modelagem-de-dados.md`

## Critérios de aceite
- [ ] Visitante pedindo `select=preco` em `unidades` recebe erro de permissão
- [ ] Visitante lê `preco_publico = null` quando `exibir_preco = false` e o valor quando `true`
- [ ] Não é possível ligar uma unidade a uma tipologia de outro empreendimento
- [ ] Unidade duplicada (mesmo número no mesmo empreendimento) é recusada

## Como testar
```bash
supabase db push --remote
```
Testar os cenários com `curl` e a chave pública; os testes automatizados entram na issue 4.
