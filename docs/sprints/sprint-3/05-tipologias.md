---
title: "Tipologias"
labels: "tipo:feature,area:painel"
---
## Contexto
Tipologia é a planta que se repete ("Tipo A, 2 quartos, 65 m²"). Cadastrar uma vez e reaproveitar em várias unidades é o que torna viável cadastrar um prédio inteiro rápido.

## O que fazer
- [ ] Seção Tipologias na edição do empreendimento: lista com nome, quartos, suítes, banheiros, vagas, área privativa e nº de unidades que usam cada uma
- [ ] Criar, editar e excluir tipologia (excluir avisa quantas unidades ficarão sem tipologia)
- [ ] Duplicar tipologia (cria "Tipo A (cópia)" com os mesmos cômodos), para plantas parecidas
- [ ] Esquema Zod compartilhado com as regras do banco (nome único no empreendimento, contagens 0 a 20, área > 0)
- [ ] Testes: unitários do esquema; e2e de criar, editar, duplicar e excluir

## Arquivos envolvidos
`src/app/(painel)/painel/empreendimentos/[id]/tipologias/*`, `src/lib/validacoes/tipologia.ts`, `tests/tipologias.spec.ts`

## Critérios de aceite
- [ ] Nome repetido no mesmo empreendimento mostra erro no campo
- [ ] Duplicar copia os cômodos
- [ ] Excluir não apaga as unidades (só tira a tipologia delas)
- [ ] Funciona no celular (390 px) e sem erros no console

## Como testar
Criar "Tipo A" (2 quartos, 65 m²), duplicar para "Tipo B" e editar para 3 quartos, depois excluir a cópia.
