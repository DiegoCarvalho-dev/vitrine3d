---
title: "Deploy na Vercel com variáveis de ambiente"
labels: "tipo:chore,area:infra"
---
## Contexto
Ter o projeto no ar desde o início: cada push na `main` atualiza o site, e já dá para mandar o link pra alguém ver.

## O que fazer
- [ ] Criar conta na Vercel (plano Hobby) logando com o GitHub
- [ ] Importar o repositório
- [ ] Configurar as variáveis de ambiente do Supabase (Production e Preview)
- [ ] Conferir que `/`, `/lab/3d` e `/lab/supabase` funcionam em produção
- [ ] Colocar o link de produção no README e na descrição do repositório

## Critérios de aceite
- [ ] URL pública funcionando, inclusive no celular (4G)
- [ ] Push na `main` dispara deploy automático

## Observação
O plano Hobby é para uso **não comercial**: perfeito para portfólio e demo. Quando houver cliente pagante, migramos (ver `docs/02`).
