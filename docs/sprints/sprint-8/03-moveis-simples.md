---
title: "Móveis simples por tipo de cômodo"
labels: "tipo:feature,area:3d,modelo:opus"
---
## Contexto
Cômodo vazio engana: o cliente não sabe se cabe uma cama de casal. Móveis simples (blocos com cantos arredondados, sem texturas pesadas) dão escala e deixam o tour mais acolhedor, sem pesar no celular.

## O que fazer
- [ ] Conjunto pequeno de móveis por tipo de cômodo (quarto: cama e guarda-roupa; sala: sofá e mesa; cozinha: bancada e geladeira; banheiro: pia, vaso e box)
- [ ] Posicionamento automático encostado nas paredes, longe das portas e janelas; se não couber, o móvel não aparece
- [ ] Geometria instanciada e materiais simples (performance no celular, `docs/02`)
- [ ] Os móveis bloqueiam a passagem no modo caminhar (colisão)
- [ ] Opção no painel para desligar os móveis da tipologia (padrão: ligados)

## Referências
- Plantas humanizadas de lançamentos: móveis em silhueta dão escala sem distrair

## Arquivos envolvidos
`src/lib/planta/furniture.ts` (novo), `src/components/three/{furniture.tsx (novo),unit-model.tsx}`, `src/lib/planta/collision.ts`, migration se a opção precisar de coluna (`tipologias.mostrar_moveis`)

## Critérios de aceite
- [ ] Cada tipo de cômodo comum tem móveis coerentes com o tamanho dele
- [ ] Nenhum móvel bloqueia porta nem atravessa parede (testes unitários)
- [ ] Modo caminhar continua liso no Android médio

## Como testar
Abrir a unidade do Residencial Demo, ver os móveis de cima e caminhar sem atravessar a cama.
