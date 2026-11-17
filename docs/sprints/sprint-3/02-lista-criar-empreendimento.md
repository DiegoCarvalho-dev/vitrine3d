---
title: "Lista de empreendimentos e criação"
labels: "tipo:feature,area:painel,prioridade:alta,seguranca"
---
## Contexto
A tela inicial do painel passa a mostrar os empreendimentos do corretor e o caminho para criar um novo. A criação pede só o essencial; o resto é preenchido na edição (issue 3).

## O que fazer
- [ ] `/painel` lista os empreendimentos do corretor (nome, cidade/UF, status com selo colorido, nº de unidades, data de atualização), com estado vazio convidando a criar o primeiro
- [ ] `/painel/empreendimentos/novo`: tipo (prédio ou casa), nome, cidade, UF, nº de andares e unidades por andar (só para prédio)
- [ ] Slug gerado com `slugify` a partir do nome, editável, com aviso se já estiver em uso
- [ ] Esquema Zod compartilhado (`src/lib/validacoes/empreendimento.ts`) com as mesmas regras do banco (slug `a-z0-9-`, UF com 2 letras, limites de andares/unidades)
- [ ] Server Action de criar: `dono_id` vem da sessão; novo empreendimento nasce em **rascunho**; redireciona para a edição
- [ ] Testes: unitários do esquema e e2e (criar prédio → aparece na lista em rascunho; slug repetido mostra erro)

## Arquivos envolvidos
`src/app/(painel)/painel/page.tsx`, `src/app/(painel)/painel/empreendimentos/novo/*`, `src/lib/validacoes/empreendimento.ts`, `src/lib/empreendimentos/*`, `tests/empreendimentos.spec.ts`

## Critérios de aceite
- [ ] O corretor só vê os próprios empreendimentos
- [ ] Criar um prédio leva menos de 1 minuto e cai na tela de edição
- [ ] Slug inválido ou repetido mostra erro claro no campo
- [ ] Funciona no celular (390 px) e sem erros no console
- [ ] `/security-review` executado

## Como testar
Entrar no painel, criar "Edifício Teste" em São Paulo/SP com 8 andares e 4 unidades por andar, e voltar para a lista.
