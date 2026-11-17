---
title: "Cômodos com prévia da planta"
labels: "tipo:feature,area:painel,area:3d"
---
## Contexto
Os cômodos geram o 3D da unidade (Sprint 5). O editor visual em grade é da Sprint 8; até lá, cada cômodo é um retângulo informado por números, com uma prévia 2D da planta para o corretor ver se está certo.

## O que fazer
- [ ] Na tipologia: lista de cômodos (nome, tipo, descrição, área calculada) com reordenação
- [ ] Formulário de cômodo: nome, tipo, descrição, x, y, largura e profundidade (em metros, aceitando vírgula), pé-direito
- [ ] **Prévia 2D da planta em SVG**, atualizando enquanto o corretor digita, com o cômodo selecionado destacado
- [ ] Validação com os esquemas Zod da planta (`roomGeometrySchema`) e checagem de **sobreposição** com os outros cômodos (mesma regra do seed)
- [ ] Soma das áreas comparada com a área privativa (aviso se passar)
- [ ] Testes: unitários (conversão retângulo → polígono, sobreposição); e2e de criar 3 cômodos e ver a prévia

## Arquivos envolvidos
`src/app/(painel)/painel/empreendimentos/[id]/tipologias/[tipologiaId]/*`, `src/components/floor-plan-preview.tsx`, `src/lib/planta/*`, `tests/comodos.spec.ts`

## Critérios de aceite
- [ ] Cômodo sobreposto a outro é recusado com mensagem clara
- [ ] A prévia mostra os cômodos em escala, com nome e área
- [ ] A área de cada cômodo é calculada sozinha
- [ ] Funciona no celular (390 px): prévia acima, formulário abaixo

## Como testar
Na "Tipo A", criar Sala (0; 0; 5 × 4), Quarto (5; 0; 3 × 3) e tentar um Banheiro sobreposto à sala (deve ser recusado).
