---
title: "Editar, publicar e excluir empreendimento"
labels: "tipo:feature,area:painel,prioridade:alta,seguranca"
---
## Contexto
Na edição o corretor completa os dados que o comprador vai ver, inclusive a seção "Segurança da compra" (`docs/05`, O6/O2), e decide quando o empreendimento vai ao ar.

## O que fazer
- [ ] `/painel/empreendimentos/[id]`: abas ou seções para Dados, Tipologias, Unidades (as duas últimas preenchidas nas issues 5 a 7)
- [ ] Dados: nome, slug, descrição, endereço, cidade, UF, andares e unidades por andar (com aviso se já houver unidades geradas)
- [ ] Segurança da compra: construtora, registro de incorporação, previsão de entrega (vazio = imóvel pronto), "informações conferidas em"
- [ ] Publicar / voltar para rascunho / arquivar, com checklist do que falta para publicar (capa, 1 tipologia com cômodos, unidades geradas)
- [ ] Excluir com confirmação digitando o nome, **só se o empreendimento não tiver leads** (apaga tipologias, unidades e mídias em cascata). Com leads, o botão vira "Arquivar" e explica que os contatos são preservados (decisão da Sprint 3: o corretor não perde leads por engano)
- [ ] Server Actions com `requireUserId` e Zod; o RLS garante que só o dono altera
- [ ] Testes: e2e de editar, publicar (bloqueado sem os requisitos) e excluir; outro corretor recebe 404 ao abrir a URL de edição

## Arquivos envolvidos
`src/app/(painel)/painel/empreendimentos/[id]/*`, `src/lib/validacoes/empreendimento.ts`, `src/lib/empreendimentos/*`, `tests/empreendimentos.spec.ts`

## Critérios de aceite
- [ ] Dados salvos continuam depois de recarregar
- [ ] Não é possível publicar sem os requisitos; a tela diz exatamente o que falta
- [ ] Excluir pede confirmação e remove o empreendimento da lista; com leads, só é possível arquivar
- [ ] URL de edição de outro corretor dá 404 (não "sem permissão", para não confirmar que existe)
- [ ] `/security-review` executado

## Como testar
Editar o "Edifício Teste", preencher a segurança da compra, tentar publicar (deve listar o que falta), arquivar e excluir um empreendimento de teste sem leads.
