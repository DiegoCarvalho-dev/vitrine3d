# Sprint 3 – Painel

**Objetivo:** o corretor cadastra sozinho, pelo painel, um prédio completo (dados, capa, tipologias com cômodos e unidades com preço e status), em menos de 20 minutos, e publica para o tour.

**Não é objetivo:** a página pública do tour (`/e/[slug]`) e o prédio 3D com dados reais (Sprint 4), o editor visual de planta em grade (Sprint 8), leads e analytics (Sprint 6).

| # | Issue | Labels |
|---|---|---|
| 1 | [Storage: bucket de mídias e upload seguro de imagens](sprint-3/01-storage-upload.md) | feature, banco, alta, segurança |
| 2 | [Lista de empreendimentos e criação](sprint-3/02-lista-criar-empreendimento.md) | feature, painel, alta, segurança |
| 3 | [Editar, publicar e excluir empreendimento](sprint-3/03-editar-publicar-empreendimento.md) | feature, painel, alta, segurança |
| 4 | [Capa do empreendimento, foto e logo do corretor](sprint-3/04-capa-foto-logo.md) | feature, painel, segurança |
| 5 | [Tipologias](sprint-3/05-tipologias.md) | feature, painel |
| 6 | [Cômodos com prévia da planta](sprint-3/06-comodos-previa-planta.md) | feature, painel, 3d |
| 7 | [Unidades: grade do prédio, preço e status](sprint-3/07-unidades-grade.md) | feature, painel, alta, segurança |
| 8 | [Fluxo completo em menos de 20 minutos](sprint-3/08-fluxo-completo.md) | chore, painel |

**Ordem sugerida:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. A 5 pode começar logo depois da 3 (não depende de upload).

## Decisões desta sprint

- **Cômodos sem editor visual, por enquanto.** O MVP prevê um editor de cômodos em grade (Sprint 8). Até lá, cada cômodo é um **retângulo** informado por posição e medidas (x, y, largura e profundidade, em metros), com uma **prévia 2D da planta** desenhada ao lado e as mesmas regras do seed (Zod, sem sobreposição, área calculada). Isso já gera o 3D na Sprint 5 e o editor da Sprint 8 só muda a forma de desenhar.
- **Unidades geradas automaticamente.** Com andares × unidades por andar, o painel cria a grade inteira de uma vez (numeração 101, 102…). O corretor só ajusta tipologia, preço, "sob consulta" e status, numa tabela com edição em massa. Cadastrar 40 unidades uma a uma inviabilizaria a meta de 20 minutos.
- **Imagens comprimidas no navegador antes do upload** (WebP, lado maior até 1920 px), para caber no Storage gratuito (cerca de 1 GB) e carregar rápido no 4G. Limite de 2 MB por arquivo, conferido também pelo Storage.
- **Caminho do arquivo é a regra de acesso:** `{dono_id}/{empreendimento_id}/...` para mídias e `{dono_id}/perfil/...` para foto e logo, com policies do Storage que só deixam o dono escrever. Leitura pública só de empreendimento publicado (e da foto/logo de quem tem algo publicado).
- **URLs de imagem validadas com Zod** (só caminhos do nosso Storage), como apontado no `/security-review` do PR #20.
- **Publicar exige o mínimo para o tour funcionar:** nome, slug, endereço, capa, pelo menos 1 tipologia com cômodos e as unidades geradas. O painel mostra o que falta.
- **Empreendimento com leads não pode ser excluído, só arquivado**, para o corretor não perder contatos por engano. Sem leads, a exclusão pede confirmação digitando o nome.
- **Toda página e Server Action do painel confere o usuário no servidor** (`requireUserId`/`getCurrentProfile`), além do RLS.
- **Branches:** todas as issues são de painel/banco, então todas vão em **branch + PR**.

## Pendências registradas em sprints anteriores (fora desta)

- Deploy na Vercel (#8) e visual de edifício real (#12): Sprint 4.
- Dados enviados pelo visitante sempre como texto (XSS) e rate limit dos inserts públicos: Sprint 6.

## Próximas sprints (rascunho, a refinar)

- **Sprint 4 – Tour (prédio):** deploy na Vercel (ex-#8), página pública `/e/[slug]` com cliente anônimo, prédio 3D com dados reais e visual de edifício real (#12), filtros, corte por andar, Open Graph.
- **Sprint 5 – Tour (unidade):** planta → 3D (paredes, portas), etiquetas, vista dollhouse, modo caminhar (desktop + toque).
- **Sprint 6 – Leads e analytics:** botão WhatsApp, formulário LGPD, eventos, e-mail de lead (Resend), painel de leads e de visualizações; dados do visitante sempre como texto; rate limit.
- **Sprint 7 – Qualidade e CI:** GitHub Actions em PR, proteção da `main`, testes e2e dos fluxos principais, performance mobile.
- **Sprint 8 – Editor de planta e polimento:** editor de cômodos em grade, demo final para portfólio.
