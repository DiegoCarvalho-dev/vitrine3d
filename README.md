# Vitrine 3D

[![CI](https://github.com/DiegoCarvalho-dev/vitrine3d/actions/workflows/ci.yml/badge.svg)](https://github.com/DiegoCarvalho-dev/vitrine3d/actions/workflows/ci.yml)

> Nome provisório. Plataforma web onde corretores de imóveis apresentam prédios, apartamentos e casas em **3D interativo**, por um **link que abre no WhatsApp**, com descrição de cada cômodo e **captação de leads** embutida.

## O problema

O corretor vende mandando fotos de celular e textos soltos no WhatsApp. O cliente não consegue visualizar o imóvel, as objeções aparecem ("é pequeno?", "a cozinha é integrada?", "qual andar tem vista?") e a venda se perde. Num lançamento na planta é ainda pior, porque não existe nada pra fotografar.

## A solução

1. O corretor cadastra o empreendimento num painel: prédio, andares, unidades, plantas e cômodos.
2. O sistema gera um **prédio 3D** com as unidades coloridas por disponibilidade.
3. O cliente recebe um link, toca no andar, entra na unidade e **caminha pelo apartamento em 3D**, lendo a descrição de cada cômodo.
4. Ao se interessar, ele fala com o corretor pelo WhatsApp, com a mensagem já dizendo qual unidade viu, e o corretor recebe o **lead** com o histórico do que o cliente olhou.

## Documentação

| Documento | Conteúdo |
|---|---|
| [01 – Visão do produto](docs/01-visao-do-produto.md) | Personas, escopo do MVP, funcionalidades, concorrência, roadmap |
| [02 – Stack e arquitetura](docs/02-stack-e-arquitetura.md) | Tecnologias, por que cada uma, limites dos planos grátis |
| [03 – Modelagem de dados](docs/03-modelagem-de-dados.md) | Diagrama ER, tabelas, regras de acesso (RLS) |
| [04 – Fluxo de trabalho](docs/04-fluxo-de-trabalho.md) | Git, branches, commits, PRs, como trabalhar com o Claude Code |
| [05 – Pesquisa de mercado](docs/05-pesquisa-de-mercado.md) | Dores dos corretores, objeções dos compradores, propostas para o produto |
| [Sprint 1](docs/sprints/sprint-1.md) | Preparação do ambiente (issues) |
| [Sprint 2](docs/sprints/sprint-2.md) | Banco de dados e login (issues) |
| [Sprint 3](docs/sprints/sprint-3.md) | Painel do corretor (issues) |

## Como rodar

Pré-requisitos: Node.js 22+, e um `.env.local` copiado do `.env.example` com os dados do projeto no Supabase.

```bash
npm install
npm run dev          # http://localhost:3000
```

## Deploy

**No ar:** https://vitrine3d-jade.vercel.app

O site roda na **Vercel** (plano gratuito), ligada a este repositório no GitHub:

- cada push na `main` publica o site;
- cada PR ganha um link de prévia próprio, para testar antes do merge;
- as funções rodam em São Paulo (`gru1`, em `vercel.json`), perto do banco;
- na Vercel só existem as duas variáveis **públicas** do `.env.example`. Nenhuma chave secreta.

## Testes

| Comando | O que testa |
|---|---|
| `npm run test` | Unitários e de componentes (Vitest) |
| `npm run test:e2e` | Navegador de verdade (Playwright), em desktop e iPhone 13 |
| `npm run test:rls` | **Segurança do banco**: regras de acesso (RLS) e permissões |
| `npm run lint` / `npm run typecheck` | Qualidade do código e tipos |

### CI (GitHub Actions)

Todo PR (e todo push na `main`) passa sozinho pelo workflow `.github/workflows/ci.yml`: formato (Prettier), lint, tipos, testes unitários e build, tudo com valores de exemplo, **sem nenhuma chave real**. Os testes de banco (RLS) e de navegador entram no CI com um banco descartável na issue #85. Para ver o resultado: aba **Checks** do PR, ou `gh pr checks`.

### Por que `test:rls` existe

A chave pública do Supabase vai para o navegador, então **quem protege os dados é o banco**, não o front-end. Os testes em `supabase/tests/rls/` simulam um visitante anônimo e corretores concorrentes tentando ler e alterar o que não podem, por exemplo:

- o preço marcado como "sob consulta" nunca chega ao visitante, nem a um corretor concorrente logado, nem por filtro ou ordenação;
- o visitante envia um lead, mas não consegue lê-lo de volta;
- um corretor não vê nem altera os dados de outro;
- excluir a conta de um corretor apaga em cascata tudo o que é dele;
- nenhuma tabela ou função fica acessível pela API sem permissão explícita.

Cada teste roda **dentro de uma transação desfeita no fim**: não deixa dados no banco e não precisa de chave secreta. Requer a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) com `supabase login` e `supabase link` feitos.

## Stack (resumo)

Next.js · TypeScript · Tailwind CSS · shadcn/ui · React Three Fiber (Three.js) · Supabase (Postgres, Auth, Storage) · Vercel · GitHub Actions

## Status

✅ Sprints 1 a 3 concluídas: ambiente, banco com RLS testado, login e perfil, e o **painel do corretor** completo: criar, editar, publicar e arquivar empreendimentos, capa, foto e logo (imagens comprimidas no navegador), tipologias, cômodos com prévia 2D da planta e unidades em grade com edição em lote. Um teste automático percorre o fluxo inteiro (do cadastro à publicação) com revisão de acessibilidade.

🚧 Próximo: Sprint 4, o tour público (`/e/[slug]`) e o deploy na Vercel.
