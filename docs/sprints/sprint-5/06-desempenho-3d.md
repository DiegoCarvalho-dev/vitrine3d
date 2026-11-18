---
title: "Desempenho e qualidade do 3D no celular"
labels: "tipo:chore,area:3d,modelo:opus"
---
## Contexto
Fecha a sprint medindo o tour em celulares de verdade e corrigindo o que pesar.

## O que fazer
- [ ] Medir fps e memória do prédio e da unidade num celular médio (Android) e no iPhone
- [ ] Ajuste automático de qualidade (resolução e sombras) quando o fps cair
- [ ] Liberar a memória ao trocar de unidade/prédio (sem vazamento)
- [ ] Mensagem amigável quando o aparelho não tem WebGL
- [ ] Registrar as medições na issue

## Arquivos envolvidos
`src/components/three/*`

## Critérios de aceite
- [ ] 30 fps ou mais no modo caminhar num celular médio
- [ ] Trocar 10 vezes de unidade não aumenta a memória sem parar

## Como testar
Abrir o tour no celular, alternar entre unidades e caminhar por um minuto.
