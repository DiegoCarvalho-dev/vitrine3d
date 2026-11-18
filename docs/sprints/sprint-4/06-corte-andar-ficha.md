---
title: "Corte por andar e ficha da unidade"
labels: "tipo:feature,area:3d,area:tour,modelo:opus"
---
## Contexto
Ao escolher um andar, o prédio "corta" acima dele e mostra as unidades daquele andar de cima. Tocar numa unidade abre a ficha com o que importa para decidir.

## O que fazer
- [ ] Seletor de andar (e toque num andar do 3D): os andares de cima somem ou ficam transparentes, a câmera aproxima
- [ ] Planta do andar vista de cima com as unidades e o status
- [ ] Ficha da unidade: número, andar, tipologia (quartos, suítes, banheiros, vagas, área), preço ou "sob consulta", status
- [ ] Botão "ver por dentro" reservado para a Sprint 5 (desativado com "em breve" ou escondido)
- [ ] Unidade aberta na URL (`?unidade=902`) para compartilhar
- [ ] Testes: e2e de escolher andar e abrir a ficha (desktop e celular)

## Arquivos envolvidos
`src/components/three/*`, `src/app/e/[slug]/*`, `tests/tour.spec.ts`

## Critérios de aceite
- [ ] Corte suave e sem travar no celular
- [ ] A ficha nunca mostra `preco` de unidade "sob consulta"
- [ ] Link com `?unidade=` abre direto na ficha

## Como testar
Escolher o 8º andar, tocar na 802, conferir a ficha e copiar o link.
