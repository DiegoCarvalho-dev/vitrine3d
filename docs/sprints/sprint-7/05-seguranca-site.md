---
title: "Segurança do site: CSP, dependências e segredos"
labels: "tipo:chore,area:infra,seguranca,modelo:opus"
---
## Contexto
O site já tem os cabeçalhos básicos, mas a política de conteúdo (CSP) só impede que ele seja aberto dentro de outro site. Uma CSP completa limita de onde vêm scripts, imagens e conexões, o que reduz muito o estrago de qualquer falha de XSS. Também falta vigiar as dependências e os segredos.

## O que fazer
- [ ] CSP completa com nonce (scripts só do próprio site), liberando só o necessário: imagens do Storage do Supabase, conexões com o Supabase, o WebGL do 3D e os estilos do Tailwind
- [ ] Testar a CSP em modo "só relatar" primeiro e depois ligar de vez, sem quebrar o tour, o painel e o login
- [ ] Dependabot (atualizações de segurança semanais, agrupadas) e `npm audit` no CI (falha só com alerta alto ou crítico)
- [ ] Varredura de segredos no CI (nenhuma chave commitada) e conferência das variáveis da Vercel
- [ ] `/security-review` geral do projeto e correção do que aparecer

## Arquivos envolvidos
`next.config.ts`, `src/proxy.ts`, `.github/dependabot.yml`, `.github/workflows/ci.yml`

## Critérios de aceite
- [ ] Nenhum erro de CSP no console no tour, na unidade (3D e caminhar), no painel e no login
- [ ] O CI falha se alguém commitar uma chave ou adicionar dependência com falha grave

## Como testar
Abrir o tour, a unidade e o painel com o console do navegador aberto: nenhum aviso de CSP.
