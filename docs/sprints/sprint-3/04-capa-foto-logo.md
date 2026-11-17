---
title: "Capa do empreendimento, foto e logo do corretor"
labels: "tipo:feature,area:painel,seguranca"
---
## Contexto
A capa aparece no tour e na prévia do link no WhatsApp (Open Graph, Sprint 4). Foto e logo do corretor deixam o tour com a cara dele (`docs/01`, "Marca do corretor").

## O que fazer
- [ ] Componente de upload de imagem (escolher, prévia, comprimir para WebP, enviar, trocar, remover), usando os helpers da issue 1
- [ ] Capa na edição do empreendimento (`empreendimentos.capa_url` guarda o **caminho** no Storage)
- [ ] Foto e logo em `/painel/perfil` (`perfis.avatar_url` e `logo_url`)
- [ ] Validar com Zod que o caminho salvo é do nosso bucket e do próprio usuário (servidor)
- [ ] Ao trocar ou remover, apagar o arquivo antigo do Storage
- [ ] Testes: e2e de enviar, trocar e remover a capa; unitário do esquema de caminho

## Arquivos envolvidos
`src/components/image-upload.tsx`, `src/app/(painel)/painel/empreendimentos/[id]/*`, `src/app/(painel)/painel/perfil/*`, `src/lib/storage/*`, `tests/midias.spec.ts`

## Critérios de aceite
- [ ] A capa aparece na lista e na edição depois de enviada
- [ ] Trocar a imagem não deixa arquivo órfão no Storage
- [ ] Salvar um caminho de outro corretor (requisição forjada) é recusado
- [ ] Funciona com foto tirada pelo celular (390 px)
- [ ] `/security-review` executado

## Como testar
Enviar uma foto grande do celular como capa, conferir o tamanho final no Storage, trocar por outra e remover.
