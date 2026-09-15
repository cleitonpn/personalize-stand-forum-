# Usabilidade por elementos físicos

A interface principal agora trabalha com paredes, testeiras, piso e móveis. Materiais e superfícies continuam no modelo de dados para preservar arquivos, permissões e regras de preço existentes; os detalhes ficam nas ferramentas avançadas.

## O que mudou

- Administração em duas etapas: revisar elementos e ver como expositor.
- Identificação por forma, orientação e proximidade, reunindo camadas e painéis do mesmo elemento. Perfis fixos deixam de exigir uma revisão por malha.
- Confirmação individual ou da lista filtrada, busca, nomes editáveis e permissões de cor, arte, movimento e giro.
- Modelos já mapeados mantêm suas decisões. Atualizar sugestões preserva nomes, tipos e permissões manuais, conjuntos confirmados e superfícies usadas por adicionais.
- Expositor seleciona no 3D ou na lista, escolhe um acabamento, envia imagem e restaura o original. A prévia do administrador usa o mesmo painel.
- Fundo em degradê azul acinzentado, contorno de seleção sem substituir o acabamento, grade durante posicionamento e layout para telas pequenas.
- Imagem proporcional cobrindo a parede agrupada, com fundo da cor escolhida. O arquivo original enviado fica no Storage; o raster usado no 3D é uma prévia.
- Desfazer/refazer e rascunho local do expositor. O salvamento é por navegador, usuário e modelo; não sincroniza entre dispositivos.
- Movimento e giro independentes, com limites considerando a peça girada. Mover na prévia do administrador não altera a posição-base salva.

## Testar sem Firebase

Na pasta `studio`, instalar dependências com `npm ci`, executar `npm run dev` e abrir `/dev/usabilidade.html`. A página existe somente para desenvolvimento e não integra o build normal.

Use **Abrir GLB do computador** para carregar um arquivo local. O modelo e as imagens de teste permanecem no navegador. Trocar o modelo reinicia as escolhas dessa prévia. Os botões de conferência não salvam no banco. Os preços dessa página são fictícios para testar o fluxo.

Para verificar apenas geometria: `node scripts/analisar-glb-local.mjs "caminho/arquivo.glb"`. Esse comando ignora texturas, não modifica o arquivo e não faz upload.

## Validação com arquivos reais fornecidos

- **ECBR 45M².glb:** 814 malhas, 23 materiais, 29 conjuntos sugeridos: 15 paredes/testeiras, 1 piso, 9 conjuntos de mobiliário e 4 de estrutura. Esses números são sugestões de agrupamento, não uma contagem certificada de peças físicas.
- **Sala de reunião.glb:** 47 malhas, 4 materiais e 5 conjuntos sugeridos. As bordas estreitas antes confundidas com paredes passaram a ser reconhecidas como perfis.
- ECBR aberto no navegador, cor e imagem aplicadas à testeira da direita. O teste revelou camadas com materiais diferentes encobrindo o acabamento; elas agora acompanham o elemento. A regra de preço original do material é mantida.
- Prévia verificada em largura de 390 px, sem transbordamento horizontal; controle de remoção da imagem acessível.
- Os dois GLBs foram testados separadamente. O encaixe da sala como adicional no ECBR não foi homologado.

## Limites e cuidados de implementação

A identificação é heurística, não um modelo de IA treinado. Camadas próximas, materiais genéricos e objetos que se encostam ainda precisam de revisão. Não há aprendizado automático das confirmações. Geometrias que já chegam fundidas em uma única malha não são automaticamente segmentadas em objetos semânticos.

Superfícies de camadas genéricas coplanares podem acompanhar a cor/arte da parede reconhecida. O material e sua regra de preço permanecem disponíveis nos ajustes avançados; a equipe deve conferir o orçamento ao aprovar o modelo. A revisão dos cálculos de área e da validação de preços no servidor está fora desta alteração de interface.

A leitura/escrita autenticada no Firebase, o upload ao Storage e o envio de proposta precisam de homologação no ambiente integrado. A página local não simula aprovação desses serviços.

## Verificação do código

`npm test` cobre separação de paredes, união de painéis, quinas, paredes inclinadas, preservação manual e de adicionais, móveis legados, recorte, permissões, limites de giro, UV compartilhada, perfis e camadas de testeiras. `npm run build` verifica a compilação de produção. O workflow `check-studio.yml` executa ambos em pull requests.
