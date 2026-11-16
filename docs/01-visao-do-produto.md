# 01 – Visão do produto

## Personas

**Corretor (nosso cliente, quem paga)**
Corretor autônomo ou de imobiliária pequena. Vende pelo WhatsApp e Instagram, não tem equipe de marketing nem dinheiro pra Matterport. Quer apresentar melhor o imóvel, saber quem está interessado de verdade e fechar mais rápido.

**Comprador (usuário final, quem visita)**
Recebe o link no celular, quer entender o imóvel em 2 minutos sem baixar nada: tamanho, divisão dos cômodos, andar, vista, preço. Quer falar com o corretor só quando estiver interessado.

**Incorporadora/construtora (cliente futuro)**
Tem lançamentos na planta e precisa de um "espelho de vendas" bonito, que mostre quais unidades estão disponíveis, reservadas ou vendidas.

## Proposta de valor

> "Mande um link, não 30 fotos. Seu cliente caminha pelo imóvel em 3D e você sabe exatamente o que ele olhou."

---

## O que os concorrentes oferecem (e o que vamos trazer)

| Concorrente / categoria | O que gera valor neles | Como trazemos pra cá | Fase |
|---|---|---|---|
| **Matterport** (tour 3D por escaneamento) | Etiquetas no ambiente com texto e mídia (Mattertags), planta baixa gerada, vista "casa de bonecas" (dollhouse), analytics de visitas | Hotspots com descrição em cada cômodo, vista de cima (dollhouse) da planta 3D, painel de visualizações | MVP |
| **Seletores de unidades / stacking plans** (CuEngine, Planpoint, ArchiCGI, Maverick Frame) | Prédio 3D com unidades **coloridas por disponibilidade**, filtros por quartos/área/preço/andar, o prédio "corta" no andar escolhido | É o coração da nossa navegação: prédio → andar → unidade, com cores e filtros | MVP |
| **Plataformas de lançamento** (Apto e similares) | Foco em marketing e **geração de leads** | Formulário de interesse, botão WhatsApp com mensagem pronta, lista de leads no painel | MVP |
| **Tours 360°** (Kuula, iTeleport, fornecedores locais) | Foto real e imersiva, barata de produzir | Foto 360° por cômodo, ligada à planta 3D | Fase 2 |
| **Tours de alto padrão** | Acesso por senha ou só para clientes qualificados (receio com segurança) | Link privado com senha opcional | Fase 2 |
| **Luma / Polycam** (Gaussian Splatting) | 3D fotorrealista a partir de vídeo | Upload de vídeo → tour fotorrealista | Fase 3 |

### Ideias extras que agregam valor

- **Link rastreável por campanha**: o corretor gera links diferentes (Instagram, grupo de WhatsApp, anúncio) e vê qual traz mais visitas e leads.
- **Termômetro de interesse do lead**: quem passou 6 minutos olhando a unidade 902 e voltou 3 vezes é um lead "quente". O corretor liga primeiro pra ele.
- **Prévia bonita no WhatsApp**: imagem de capa, título e preço aparecem quando o link é colado (Open Graph).
- **Marca do corretor**: foto, logo, cores e CRECI no tour. O corretor parece maior do que é.
- **Simulador de financiamento simples** (SAC/Price) dentro da unidade.
- **Mapa e arredores**: localização e pontos de interesse próximos (OpenStreetMap, gratuito).
- **Comparar unidades** e **favoritar** (ex.: 902 × 1102: preço, vista, área).
- **Descrição por IA**: o corretor sobe as fotos e a IA sugere o texto de cada cômodo (Fase 2, tem custo pequeno por uso).

### Sobre "buscar leads"

O produto **capta e qualifica** leads: identifica quem visitou, o que olhou e quanto se interessou. Ele **não** vai garimpar contatos de pessoas na internet, porque isso esbarra na **LGPD** e queima a reputação do corretor. Todo lead entra com **consentimento** registrado. Esse é também um argumento de venda: o corretor fica em conformidade.

---

## Escopo do MVP (Fase 1)

### Dentro
- [ ] Login do corretor (e-mail/senha ou link mágico)
- [ ] Perfil do corretor: nome, WhatsApp, CRECI, foto, cor da marca
- [ ] Cadastro de empreendimento (prédio ou casa): nome, endereço, descrição, capa, nº de andares, unidades por andar
- [ ] Dados de **segurança da compra**: construtora, nº do registro de incorporação, previsão de entrega, e a data em que as informações foram conferidas *(ver `docs/05`, O6/O2)*
- [ ] Cadastro de **tipologias** (plantas que se repetem: "Tipo A, 2 quartos, 65 m²") e seus **cômodos**, com descrição e área
- [ ] Editor simples de planta: o corretor desenha os cômodos como retângulos numa grade (gera o 3D)
- [ ] Unidades: número, andar, tipologia, preço, status (disponível / reservado / vendido), e a opção **mostrar preço ou "sob consulta"** *(ver `docs/05`, D3/O4)*
- [ ] Página pública por link (`/e/[slug]`):
  - [ ] Prédio 3D gerado automaticamente, unidades coloridas por status
  - [ ] Filtros: quartos, faixa de preço, andar, só disponíveis
  - [ ] Ao escolher um andar, o prédio "corta" e mostra as unidades daquele andar
  - [ ] Unidade em 3D: vista de cima (dollhouse) + modo caminhar em primeira pessoa (mouse/teclado e toque)
  - [ ] Etiquetas por cômodo com descrição e área
  - [ ] Botão WhatsApp com mensagem pronta ("Olá! Vi a unidade 902 no tour…")
  - [ ] Formulário de interesse com consentimento LGPD
  - [ ] Seção **"Segurança da compra"** (construtora, registro de incorporação, previsão de entrega)
  - [ ] Selo **"imagem ilustrativa"** no 3D + "informações conferidas em [data]"
- [ ] Painel de leads e de visualizações básicas, com **resumo de resultados** ("seu tour gerou X leads e Y visualizações este mês")
- [ ] **E-mail para o corretor a cada lead novo**, com o contexto do que a pessoa viu (unidades, tempo, cômodos) *(ver `docs/05`, D4)*
- [ ] Prévia do link no WhatsApp (Open Graph)
- [ ] Funciona bem no celular

### Fora do MVP (vai pras próximas fases)
- Fotos 360°, links com senha, links por campanha, simulador, mapa, comparador → **Fase 2**
- Descrição por IA → **Fase 2**
- Vídeo → 3D fotorrealista (Gaussian Splatting) → **Fase 3**
- Várias contas por imobiliária (equipes), cobrança/assinatura → **Fase 4**

## Roadmap

| Fase | Objetivo | Resultado |
|---|---|---|
| **Sprint 1** | Ambiente pronto | Repositório, projeto rodando local, Supabase conectado, testes e prova de conceito 3D (deploy na Vercel passou para a Sprint 4; CI na Sprint 7) |
| **Fase 1 – MVP** | Portfólio + demo pra corretor | Fluxo completo prédio → unidade → lead |
| **Fase 2 – Valor** | Primeiro cliente piloto | 360°, IA, campanhas, senha, simulador |
| **Fase 3 – Realismo** | Diferencial técnico | Vídeo → Gaussian Splatting |
| **Fase 4 – Negócio** | Vender | Equipes, planos pagos, domínio próprio |

## Métricas de sucesso do MVP

- Um corretor consegue cadastrar um prédio com 1 tipologia em **menos de 20 minutos**.
- O tour abre no celular em **menos de 3 segundos** numa conexão 4G.
- Pelo menos **2 corretores reais** testam e dão feedback.
