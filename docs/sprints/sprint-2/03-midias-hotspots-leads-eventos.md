---
title: "Banco: mídias, hotspots, leads e eventos"
labels: "tipo:feature,area:banco,seguranca"
---
## Contexto
Fecha o modelo do MVP. `leads` e `eventos` são as únicas tabelas em que o **visitante escreve** (formulário de interesse e registro anônimo de navegação), então são as mais sensíveis a abuso.

## O que fazer
- [ ] Enums `tipo_midia`, `status_lead` e `tipo_evento`
- [ ] Tabelas `midias` e `hotspots` (leitura pública se o empreendimento está publicado; CRUD do dono)
- [ ] Tabela `leads`:
  - visitante **só insere** (nunca lê, altera ou apaga), e só em empreendimento publicado
  - `consentimento_lgpd = true` obrigatório (check) e `consentimento_em` preenchido pelo banco
  - limites de tamanho em `nome`, `telefone`, `email`, `mensagem`, `origem`
  - dono lê e atualiza o status dos seus leads
- [ ] Tabela `eventos` (`bigint` identity): visitante só insere; dono lê os seus; `dados` jsonb com limite de tamanho
- [ ] `on delete set null` nas referências opcionais (`leads.unidade_id` etc.)
- [ ] Índices: `leads(empreendimento_id, criado_em desc)`, `eventos(empreendimento_id, criado_em desc)`, `eventos(sessao_id)`
- [ ] Regenerar os tipos; `supabase db advisors --remote` sem avisos

## Arquivos envolvidos
`supabase/migrations/*_midias_hotspots_leads_eventos.sql`, `src/types/database.ts`, `docs/03-modelagem-de-dados.md` (se algo mudar)

## Critérios de aceite
- [ ] Visitante insere um lead com consentimento em empreendimento publicado, mas não consegue lê-lo de volta
- [ ] Lead sem consentimento é recusado pelo banco
- [ ] Lead em empreendimento em rascunho é recusado
- [ ] Um corretor não vê leads de outro corretor

## Como testar
```bash
supabase db push --remote
```
Cenários com `curl` e a chave pública; automatizados na issue 4.
