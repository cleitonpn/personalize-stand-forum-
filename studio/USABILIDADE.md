# Usabilidade por elementos físicos

A interface principal agora trabalha com paredes, testeiras, piso e móveis. Materiais e superfícies continuam no modelo de dados para preservar arquivos, permissões e regras de preço existentes; os detalhes ficam nas ferramentas avançadas.

## O que mudou

- Administração em duas etapas: revisar elementos e ver como expositor.
- Identificação por forma, orientação e componentes de origem do GLB. Camadas sobrepostas podem acompanhar a parede; painéis adjacentes permanecem separados. Perfis fixos deixam de exigir uma revisão por malha.
- Logos/placas têm seleção própria, cor, envio de arte e remoção reversível, conforme permissões do administrador.
- “Separar ou juntar partes” abre um editor funcional com destaque no 3D, divisão pelos componentes originais ou por malhas, união manual e desfazer. As decisões manuais prevalecem na próxima detecção. Dividir um móvel preserva seu posicionamento; para unir móveis deslocados é necessário restaurar primeiro a posição original.
- Confirmação individual ou da lista filtrada, busca, nomes editáveis e permissões de cor, arte, movimento e giro.
- Modelos já mapeados mantêm suas decisões. Atualizar sugestões preserva nomes, tipos e permissões manuais, conjuntos confirmados e superfícies usadas por adicionais.
- Expositor seleciona no 3D ou na lista, escolhe um acabamento, envia imagem e restaura o original. A prévia do administrador usa o mesmo painel.
- Fundo em degradê azul acinzentado, contorno de seleção sem substituir o acabamento, grade durante posicionamento e layout para telas pequenas.
- Imagem proporcional cobrindo a parede agrupada, com fundo da cor escolhida. O arquivo original enviado fica no Storage; o raster usado no 3D é uma prévia.
- Desfazer/refazer e rascunho local do expositor. O salvamento é por navegador, usuário e modelo; não sincroniza entre dispositivos.
- Movimento e giro independentes, com limites considerando a peça girada. Mover na prévia do administrador não altera a posição-base salva.

## Balcões e inclusões por GLB

Balcões reconhecidos na importação recebem cor no conjunto e arte apenas na face frontal. Para um móvel não reconhecido ou um modelo já salvo, abra seu cartão, ative **Arte somente na frente** e **Liberar cor e arte frontal**. A direção é sugerida pela geometria; pode ser ajustada em graus. A projeção atende frentes planas, inclusive em malhas únicas e balcões rotacionados. Formas curvas ou frentes com recortes exigem revisão da prévia.

**Inclusões e substituições por GLB** fica na tela principal. Também é possível partir do cartão da parede com **Incluir ou substituir por outro GLB**: a escolha aparecerá junto dessa parede para o cliente. Envie o adicional, posicione pelo clique no piso ou ajuste X/altura/Z, e escolha no 3D ou na lista os elementos a ocultar. Conclua a seleção e confira a prévia. O tamanho e a orientação originais do arquivo são preservados. O cliente pode desfazer a inclusão escolhendo **Como está no projeto**; clicar no GLB substituto vinculado reabre as opções da peça original.

O laboratório local permite carregar o projeto e os adicionais sem enviar dados ao Firebase. A sala fornecida foi testada como adicional do ECBR, com posicionamento e reversão da substituição; isso não certifica o encaixe construtivo.

## Testar sem Firebase

Na pasta `studio`, instalar dependências com `npm ci`, executar `npm run dev` e abrir `/dev/usabilidade.html`. A página existe somente para desenvolvimento e não integra o build normal.

Use **Abrir GLB do computador** para carregar um arquivo local. O modelo e as imagens de teste permanecem no navegador. Trocar o modelo reinicia as escolhas dessa prévia. Os botões de conferência não salvam no banco. Os preços dessa página são fictícios para testar o fluxo.

Para verificar apenas geometria: `node scripts/analisar-glb-local.mjs "caminho/arquivo.glb"`. Esse comando ignora texturas, não modifica o arquivo e não faz upload.

## Validação com arquivos reais fornecidos

- **ECBR 45M².glb:** 814 malhas, 23 materiais, 40 conjuntos sugeridos: 18 paredes/testeiras, 1 logo/placa, 1 piso, 16 conjuntos de mobiliário e 4 de estrutura. As oito banquetas e o balcão são independentes; os três painéis do fundo permanecem separados. Esses números são sugestões de agrupamento, não uma contagem certificada de peças físicas.
- Regressão específica: `node scripts/validar-ecbr-local.mjs "caminho/ECBR 45M².glb"`. Verifica balcão, banquetas, três painéis, permissões do logo e união/separação reversível. O arquivo não é incluído no repositório.
- **Sala de reunião.glb:** 47 malhas, 4 materiais e 6 conjuntos sugeridos. As bordas estreitas antes confundidas com paredes passaram a ser reconhecidas como perfis.
- ECBR aberto no navegador, cor e imagem aplicadas à testeira da direita. O teste revelou camadas com materiais diferentes encobrindo o acabamento; elas agora acompanham o elemento. A regra de preço original do material é mantida.
- Prévia verificada em largura de 390 px, sem transbordamento horizontal; controle de remoção da imagem acessível.
- Os dois GLBs foram testados separadamente. O encaixe da sala como adicional no ECBR não foi homologado.

## Limites e cuidados de implementação

A identificação é heurística, não um modelo de IA treinado. Camadas próximas, materiais genéricos e objetos que se encostam ainda precisam de revisão. Não há aprendizado automático das confirmações. Geometrias que já chegam fundidas em uma única malha não são automaticamente segmentadas em objetos semânticos.

Superfícies de camadas genéricas coplanares podem acompanhar a cor/arte da parede reconhecida. O material e sua regra de preço permanecem disponíveis nos ajustes avançados; a equipe deve conferir o orçamento ao aprovar o modelo. A revisão dos cálculos de área e da validação de preços no servidor está fora desta alteração de interface.

A leitura/escrita autenticada no Firebase, o upload ao Storage e o envio de proposta precisam de homologação no ambiente integrado. A página local não simula aprovação desses serviços.

## Verificação do código

### Catálogo de mobiliário

No editor de cada modelo, **Catálogo de mobiliário** permite criar categorias e enviar GLBs de peças individuais ou conjuntos. Defina o nome, preço adicional por unidade, limite de quantidade (1 a 30; padrão 10), posição inicial e os elementos do projeto que a alternativa pode substituir. Por exemplo, marque os dois bistrôs e as seis banquetas para liberar a troca por outro conjunto. A configuração é por modelo de estande, não uma biblioteca global de estoque.

O expositor encontra **Incluir / substituir móveis**. **Adicionar** mantém o mobiliário padrão; **Substituir** retira os elementos definidos pelo admin. Cada unidade tem identidade, posição e rotação próprias, mantém a escala do GLB e pode ser removida. A seleção pela lista ou pelo 3D destaca a unidade; setas movem 25 cm e os botões giram 15°. Remover a última unidade que substitui um conjunto restaura os originais. Um botão também restaura toda a categoria.

As escolhas usam o histórico e rascunho existentes. Preços somam cada unidade, sem cobrar acabamentos dos elementos substituídos. O preço da troca é adicional, sem crédito automático pelo mobiliário padrão. Propostas registram arquivo, instância, deslocamento, giro e IDs substituídos; o PDF do cliente e do admin inclui as escolhas, mesmo gratuitas.

Validação: 33 testes automatizados e build; teste visual local com uma banqueta extraída do ECBR, duas unidades, substituição de duas cadeiras, limite de quantidade, total de R$ 300, movimento, giro de 15°, destaque e restauração para R$ 0. O arquivo de teste não é enviado ao servidor nem incluído no repositório. O posicionamento limita a caixa do móvel à área quando há espaço, mas não resolve colisões entre móveis, paredes ou circulação. Confira a distribuição na vista de cima. Upload autenticado e envio ao Firebase continuam sujeitos à homologação integrada indicada acima.

`npm test` cobre separação de paredes, união manual de painéis, componentes do GLB, logo removível, posição após separar móveis girados, preservação manual e de adicionais, móveis legados, recorte, permissões, limites de giro, UV compartilhada, perfis e camadas de testeiras. `npm run build` verifica a compilação de produção. O workflow `check-studio.yml` executa ambos em pull requests.
