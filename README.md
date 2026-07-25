# Personalize seu Stand — Fórum E-commerce Brasil

Protótipo comercial (v1) do configurador de personalização de estandes.
O cliente que comprou seu espaço no Fórum E-commerce Brasil acessa com login,
abre a versão base comprada (**Opção C**, 40 m² · 10,00 × 4,00 m) e vai
incluindo personalizações que refletem **em tempo real nas duas vistas**:
a **vista 3D do projeto** e a **planta baixa interativa** logo abaixo.

## Conceito

Não é um "tour 3D" — é um **configurador comercial (CPQ)**. Existe uma única
fonte de verdade (`src/store/StandStore.jsx`) que descreve a configuração do
estande; a vista 3D e a planta baixa apenas desenham esse estado. Nenhuma vista
conversa com a outra — as duas leem do mesmo lugar e despacham ações. É isso
que mantém tudo sincronizado e fácil de evoluir.

## O que já funciona nesta v1

- **Login** (mockado) → abre a Opção C montada.
- **Piso**: troca de cor do carpete (Eventos / Ecoloop) ou substituição por
  **piso vinílico**. Cores reais dos catálogos Casa Brasil (códigos CB###).
- **Paredes (napa)**: napa lisa, amadeirada ou especial, com paleta real.
- **Painel de LED na testeira** (liga/desliga, como nas Opções A/B).
- **Depósito**: arrastar na planta para reposicionar e redimensionar,
  **respeitando a área mínima** original.
- **Sala de reunião de vidro** com porta (até 4,00 × 3,00 m), posicionável.
- **Mobiliário** e **paisagismo**: adicionar itens de uma biblioteca curada e
  arrastar na planta.
- **Pontos de elétrica extras**: escolher o tipo e **clicar na planta baixa**
  onde deseja o ponto.
- **Lonas e logos** adicionais.
- **Orçamento incremental** em tempo real (cada extra soma).
- **Resumo comercial** exportável em **PDF** e **JSON** — documento para o
  time comercial dar continuidade no atendimento pós-venda com o cliente.
- **Salva automaticamente** no navegador (`localStorage`).

## Stack

React + Vite + **react-three-fiber** / **drei** / **three** (vista 3D
paramétrica) e **SVG** (planta baixa interativa). Sem backend: roda 100%
offline, ideal para a apresentação.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção (dist/)
npm run preview  # servir o build
```

Login da demo: usuário **cliente** · senha **1234**.

## Estrutura

```
src/
  data/catalogo.js        Cores reais (CB###), mobiliário, paisagismo, preços e regras
  store/StandStore.jsx    Fonte única de verdade + orçamento derivado + persistência
  components/
    Login.jsx             Acesso do cliente (mock)
    Topbar.jsx            Cabeçalho + recomeçar
    Sidebar.jsx           Configurador (todas as categorias de personalização)
    Scene3D.jsx           Vista 3D em tempo real (geometria paramétrica)
    PlantaBaixa.jsx       Planta baixa interativa (arrastar / clicar)
    Resumo.jsx            Orçamento + exportação do resumo comercial
    ErrorBoundary.jsx     Blindagem de componentes
```

## Próximos passos (fase 2)

- Substituir os **placeholders paramétricos** por **GLBs / renders reais** das
  peças que os projetistas vão modelar (LED, sala de vidro, mobiliário etc.) —
  a arquitetura já prevê a troca sem mexer na lógica.
- Backend real (ex.: **Firebase**) para login por cliente, cadastro vindo da
  organizadora e persistência multiusuário.
- Painel **admin** de catálogo e preços (o time comercial edita cores/valores).
- Validações de fabricação mais finas e aprovação/versão de projeto.

> Valores e alguns acabamentos são ilustrativos neste protótipo.
