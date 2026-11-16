# Vitrine 3D

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

## Stack (resumo)

Next.js · TypeScript · Tailwind CSS · shadcn/ui · React Three Fiber (Three.js) · Supabase (Postgres, Auth, Storage) · Vercel · GitHub Actions

## Status

🚧 Sprint 1: preparação do ambiente.
