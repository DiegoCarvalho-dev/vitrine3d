---
title: "Storage: bucket de mídias e upload seguro de imagens"
labels: "tipo:feature,area:banco,prioridade:alta,seguranca"
---
## Contexto
Capa do empreendimento, foto e logo do corretor (e, mais tarde, fotos dos cômodos) ficam no Supabase Storage. O plano grátis tem pouco espaço (cerca de 1 GB) e o tour precisa abrir rápido no 4G, então as imagens precisam ser leves. O caminho do arquivo é o que define quem pode escrever.

## O que fazer
- [ ] Migration: bucket `midias` (público para leitura de URL, com limite de 2 MB e só `image/webp`, `image/jpeg`, `image/png`)
- [ ] Policies de `storage.objects`:
  - escrita (insert/update/delete) só no próprio caminho: `{dono_id}/{empreendimento_id}/...` (empreendimento do usuário) e `{dono_id}/perfil/...`
  - upsert funcionando (insert + select + update, como exige o Storage)
  - leitura pela API só de arquivos de empreendimento publicado ou do próprio dono
- [ ] Helper no navegador que comprime para **WebP** (lado maior até 1920 px, qualidade ~0,8) antes de enviar
- [ ] Helper de upload que monta o caminho a partir da sessão (nunca do formulário) e devolve só o caminho salvo
- [ ] Esquema Zod para caminhos de imagem (só caminhos do nosso bucket, sem `..`)
- [ ] Testes de RLS do Storage (`supabase/tests/rls/05_storage.sql`): dono escreve no próprio caminho; outro corretor e visitante não; extensão/tipo inválido recusado
- [ ] Testes unitários do esquema de caminho e da compressão (dimensões finais)

## Arquivos envolvidos
`supabase/migrations/*_storage_midias.sql`, `supabase/tests/rls/05_storage.sql`, `src/lib/storage/*`, `src/lib/validacoes/midia.ts`, `docs/03-modelagem-de-dados.md`

## Critérios de aceite
- [ ] Corretor A não consegue enviar arquivo para a pasta de B (nem por URL forjada)
- [ ] Visitante não envia nada e não lê arquivo de empreendimento em rascunho
- [ ] Uma foto de celular de 5 MB vira um WebP de poucas centenas de KB antes do envio
- [ ] Arquivo que não é imagem é recusado pelo navegador **e** pelo Storage
- [ ] `npm run test:rls` passa com os cenários novos; `/security-review` executado

## Como testar
```bash
npm run test:rls
```
O upload pela interface entra na issue 4 (capa, foto e logo).
