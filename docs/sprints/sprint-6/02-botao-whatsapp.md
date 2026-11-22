---
title: "Botão WhatsApp com mensagem pronta"
labels: "tipo:feature,area:tour,modelo:sonnet"
---
## Contexto
O corretor vende pelo WhatsApp. O caminho mais curto do tour até a conversa é um botão que já abre o WhatsApp do corretor com a mensagem escrita.

## O que fazer
- [ ] Botão "Falar no WhatsApp" fixo no celular (canto inferior) e visível no desktop, no prédio e na unidade
- [ ] Mensagem pronta com o contexto: "Olá! Vi o Residencial X no tour 3D" ou "…e me interessei pela unidade 902"
- [ ] Link `https://wa.me/<numero>?text=…` com o WhatsApp do perfil (E.164) e o texto codificado
- [ ] Sem WhatsApp no perfil: o botão não aparece (o formulário da issue 3 continua)
- [ ] Registrar o evento `clicou_whatsapp` (issue 1)
- [ ] Testes: unitário da mensagem e do link; e2e de que o botão leva ao link certo

## Arquivos envolvidos
`src/lib/tour/whatsapp.ts`, `src/app/e/[slug]/*`

## Critérios de aceite
- [ ] No celular abre o app do WhatsApp com a mensagem pronta
- [ ] O botão não cobre o joystick do modo caminhar nem os filtros

## Como testar
No celular, abrir uma unidade, tocar em "Falar no WhatsApp" e conferir a mensagem.
