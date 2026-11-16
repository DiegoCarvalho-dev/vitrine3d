---
title: "Prova de conceito 3D: prédio de caixas com React Three Fiber"
labels: "tipo:feature,area:3d,prioridade:alta"
---
## Contexto
Validar cedo a parte mais arriscada do projeto: 3D rodando liso no navegador **e no celular**.

## O que fazer
- [ ] Instalar `three`, `@react-three/fiber`, `@react-three/drei` (+ `@types/three`)
- [ ] Criar `src/components/three/BuildingPreview.tsx`: prédio gerado por props `floors` e `unitsPerFloor` (uma caixa por unidade)
- [ ] Cores por status mockado (disponível = verde, reservado = amarelo, vendido = cinza)
- [ ] `OrbitControls` para girar e dar zoom (mouse e toque)
- [ ] Clicar numa caixa mostra no console/tela qual unidade foi clicada (ex.: "902")
- [ ] Página `/lab/3d` carregando a cena com `dynamic(..., { ssr: false })`

## Critérios de aceite
- [ ] `/lab/3d` mostra um prédio de 10 andares × 4 unidades
- [ ] Gira e dá zoom com o dedo no celular, sem travar
- [ ] Clique/toque identifica a unidade correta
- [ ] Sem erros no console

## Como testar
Abrir http://localhost:3000/lab/3d no desktop e no celular (mesma rede: `npm run dev -- -H 0.0.0.0` e acessar pelo IP do computador).

## Referências
https://r3f.docs.pmnd.rs · https://drei.docs.pmnd.rs
