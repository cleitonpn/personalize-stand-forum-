# USET Stand Studio — documento do projeto

Registro do que foi decidido, do que foi construído, do que foi aprendido
apanhando dos arquivos reais, e do que ainda falta.

Última atualização: 12 de setembro de 2026.

---

## Índice

1. [O que é o produto](#1-o-que-é-o-produto)
2. [Os dois aplicativos deste repositório](#2-os-dois-aplicativos-deste-repositório)
3. [Os quatro conceitos que sustentam tudo](#3-os-quatro-conceitos-que-sustentam-tudo)
4. [O fluxo de trabalho, ponta a ponta](#4-o-fluxo-de-trabalho-ponta-a-ponta)
5. [Precificação](#5-precificação)
6. [O que os arquivos reais ensinaram](#6-o-que-os-arquivos-reais-ensinaram)
7. [Infraestrutura e publicação](#7-infraestrutura-e-publicação)
8. [Mapa do código](#8-mapa-do-código)
9. [Modelo comercial do sistema](#9-modelo-comercial-do-sistema)
10. [O que falta](#10-o-que-falta)
11. [Decisões que já foram tomadas e não convém reabrir](#11-decisões-que-já-foram-tomadas-e-não-convém-reabrir)

---

## 1. O que é o produto

Uma ferramenta onde o **expositor de feira** abre o projeto 3D do estande que
contratou da USET, personaliza o que a montadora permite — cor de parede, cor de
carpete, arte impressa, posição do mobiliário, peças opcionais — vê o preço
mudar a cada escolha e envia a proposta. Do outro lado, o **time da USET** sobe o
`.glb` do projeto, define o que é personalizável, precifica, cadastra o
expositor e recebe a proposta pronta.

O ponto de partida é sempre o arquivo do projetista. O sistema não modela nada:
ele lê o projeto que já existe e decide o que dele pode ser mexido.

**Dois públicos, duas telas deliberadamente diferentes.** O admin vê nome de
material de CAD, contagem de peças e triângulos. O expositor nunca vê nada
disso — ele vê "Parede do fundo", uma cartela de cores grande e vistas prontas
de câmera. Essa separação é uma regra do projeto, não um detalhe de estilo: o
expositor é alguém que nunca abriu um software 3D.

---

## 2. Os dois aplicativos deste repositório

### Raiz — protótipo do Fórum

O primeiro protótipo, de um estande único do Fórum, com estado em `localStorage`
e sem backend. Publicado no **GitHub Pages** pelo `deploy.yml`. Continua intacto
e funcionando; serviu para validar a ideia e ainda é útil como demonstração
(inclusive com um modo `?demo=1` que zera valores para telas de vitrine).

Nada do que foi feito no Studio alterou esse protótipo.

### `studio/` — a plataforma multi-modelo

O produto de verdade. React + Vite + react-three-fiber, com Firebase
(Auth, Firestore, Storage, Hosting, Functions). Publicado no **Firebase
Hosting** pelo `deploy-studio.yml`.

É onde todo o trabalho recente aconteceu e é o que este documento descreve
daqui para frente.

---

## 3. Os quatro conceitos que sustentam tudo

Esta seção é a mais importante do documento. Cada um destes conceitos nasceu de
um problema concreto, e confundi-los foi a origem de quase todos os bugs.

### 3.1 Material → papel

O arquivo do projetista tem entre 18 e 23 **materiais** e entre 800 e 33 mil
**nós**. Os nomes dos nós são lixo (`Geom3D`, `Componente#51`, sem nome); os
nomes dos materiais são semânticos (`VS_bagum-preto3`, `Tapete 1`,
`Tiffany - Metal Preto`).

Por isso a classificação é **por material**: o admin atribui um papel a cada
material e isso classifica milhares de peças de uma vez. Papéis disponíveis:

| Papel | Personalizável | O que é |
|---|---|---|
| Lona impressa | sim | recebe arte do expositor |
| Bagum | sim | revestimento têxtil, troca de cor |
| Piso / carpete | sim | carpete ou vinílico |
| Adesivo / logo | sim | aplicação de marca |
| Madeira | sim | padrão amadeirado |
| Vidro | não | estrutural |
| Metal / estrutura | não | perfis e ferragens |
| Mobiliário | não | cadeiras, mesas, balcões |
| Iluminação | não | spots e trilhos |
| Ignorar | — | céu do render, pranchas 2D, cópias espelhadas |

O sistema **sugere** um papel por material combinando nome e geometria, e o
admin corrige. A sugestão nunca é a palavra final.

### 3.2 Superfície — o que recebe uma cor

Material é bom para classificar e péssimo para personalizar: quinze painéis
gráficos podem compartilhar o material `Madeira 16`, e mexer no material mexeria
nos quinze de uma vez. O inverso também ocorre — a banqueta tem assento e pés em
materiais diferentes.

Então a **superfície** é um conjunto nomeado de peças. O material apenas semeia
o estado inicial; a partir daí o admin **divide** (por peça ou por proximidade)
e **une** livremente.

Cada superfície carrega permissões explícitas: *cliente troca a cor*, *cliente
sobe arte*. Quem decide é o admin — a heurística só define o valor inicial.

### 3.3 Objeto — o que se move junto

Pergunta diferente, agrupamento diferente. O balcão é **um objeto** (move
inteiro) e **duas superfícies** (marcenaria e adesivo frontal, personalizados em
separado). As cadeiras podem compartilhar superfície para a cor e ainda assim
precisar se mover em separado.

A detecção é por **contato entre peças**, com duas regras que não são opcionais:

- **O casco do estande fica fora do grafo.** Com piso e paredes dentro, a
  cadeira encosta no carpete, o carpete na parede, a parede na estrutura do
  teto, e o arquivo inteiro colapsa num objeto só. Só mobiliário, adesivo e
  madeira entram.
- **O agrupamento manual do admin vem antes do contato.** Quando ele une pernas,
  tampo e parafusos numa superfície, já respondeu que aquilo é uma coisa só, e a
  detecção não pode desmanchar isso. Vale **apenas** para a superfície unida à
  mão: toda peça pertence a alguma superfície desde o início, e tratar todas como
  atômicas significaria "mesmo material, mesmo objeto" — as 328 peças de metal
  preto viram um objeto só e a detecção deixa de existir.

Objetos carregam `podeMover`, `podeGirar` e `incluso`. Só é móvel por padrão o
que assenta no chão **e tem porte de móvel** (≤ 3,2 m de largura e profundidade,
≤ 2,2 m de altura) — sem esse segundo critério a parede de marcenaria de
9,80 × 2,90 m entrava na lista do cliente e dava para arrastar a parede do
estande.

**As três telas são o mesmo mapeamento.** Reagrupar superfícies refaz os objetos
automaticamente, preservando os ajustes item a item (nome, permissões, incluso,
posição) por casamento de peças em comum.

### 3.4 Complemento — o que troca a geometria

Cor e arte mudam o acabamento de algo que já existe. Faltava o que a montadora
também vende: **incluir uma peça** que não está no projeto (painel de LED) e
**levar uma peça para outro lugar** (depósito no centro, na ponta esquerda ou na
direita).

As duas são a mesma pergunta — *"neste ponto do estande, qual das opções?"* — e
cada opção é um `.glb` próprio, exportado do **mesmo ponto de origem** do
projeto.

**Os grupos são independentes de propósito.** Enumerar combinações multiplica os
arquivos: 5 perguntas de 3 opções seriam 243 arquivos. Como perguntas separadas,
são 15. A conta soma em vez de multiplicar.

Cada opção declara **o que esconde**. Sem isso, escolher o depósito na ponta
deixaria os dois na cena. E o que fica escondido sai do orçamento: se o expositor
pintou a parede do depósito e depois levou o depósito para a ponta, aquela parede
não existe mais — cobrá-la seria vender uma lona que ninguém imprime.

### 3.5 A chave da peça

Peças precisam de identidade estável entre carregamentos. O `uuid` do three.js é
gerado a cada load e não sobrevive a um reload, então a chave é
**material + posição do centro no mundo**, arredondada a 2 casas. É propriedade
do arquivo, não da sessão.

Peças exatamente coincidentes colidem de propósito: são as duplicatas já
detectadas e, para personalizar, intercambiáveis.

---

## 4. O fluxo de trabalho, ponta a ponta

### Lado da USET (admin)

1. **Modelos → Novo modelo.** Envia o `.glb` do projeto.
2. **Materiais.** Confere os papéis sugeridos e corrige. Aqui se descarta o que
   não é estande (céu do render, pranchas 2D).
3. **Área do estande.** Recorta a área contratada. Obrigatório em projeto
   espelhado — sem isso a metragem sai pelo dobro.
4. **Superfícies.** Divide e une até que cada coisa personalizável seja uma
   superfície. Liga as permissões. Renomeia com o nome que o expositor vai ler.
5. **Objetos.** Confere o que se move e libera `Cliente move` / `Cliente gira`.
   A lista se refaz sozinha quando as superfícies mudam.
6. **Complementos.** Cria as perguntas de peça opcional e sobe os `.glb`.
7. **Preços.** Define R$/m² por papel e R$/peça por tipo de objeto.
8. **Prévia.** Vê exatamente o que o expositor vai ver.
9. **Salvar mapeamento.**
10. **Expositores.** Cadastra nome, e-mail, feira e projeto, com senha
    provisória de troca obrigatória.
11. **Propostas.** Recebe o que o expositor enviou.

### Lado do expositor

1. Entra e troca a senha provisória.
2. Tutorial de sete passos na primeira entrada, rechamável a qualquer momento.
3. Personaliza: cores por cartela, arte por upload, peças opcionais, mover e
   girar móveis.
4. Vê o total mudar a cada escolha.
5. **Gravar e gerar proposta** — a proposta vai para a USET e ele baixa o PDF.

### Gestão de contas

Toda conta tem "Minha conta" para trocar a própria senha. O admin edita dados,
envia link de nova senha, define senha provisória, **desativa** (reversível,
caminho recomendado) e **exclui**.

Desativar vale no servidor, não só na tela: as regras do Firestore e do Storage
exigem perfil ativo para ler o modelo, gravar proposta e subir arte.

---

## 5. Precificação

Duas réguas, conforme a regra da montadora:

- **Superfície cobra por m²** — lona, adesivo, carpete, bagum, madeira.
- **Objeto cobra por peça** — mobiliário, balcões.

A metragem sai da **geometria do projeto**, não de digitação. A área de uma peça
é o produto das duas maiores dimensões, que é a face que recebe impressão: um
painel de 2,90 × 2,90 × 0,10 vale 8,41 m² de lona, não a área do bloco com as
bordas de 10 cm.

**Dois descontos são obrigatórios**, e os dois vieram de medir os arquivos reais:

| Cuidado | Sem ele | Com ele |
|---|---|---|
| Deduplicar por chave | A08_Garnet_Shadow: 146 m² | 53 m² |
| Respeitar o recorte | carpete do 45m²: 90 m² | 45 m² |

**O mobiliário que vem no projeto está incluso** e não é cobrado. Todo objeto
detectado nasce com `incluso = true`. A régua por peça vale para o que o
expositor **acrescentar** e para itens que o admin marque explicitamente como
não inclusos.

Complemento com preço zero — trocar o depósito de lugar, tipicamente — **não
vira linha de orçamento mas continua registrado na proposta**, porque a produção
precisa saber o que montar.

---

## 6. O que os arquivos reais ensinaram

Esta seção existe porque cada item abaixo custou um bug. Quem for mexer no
ingest deveria ler antes.

### 6.1 Os arquivos

| Arquivo | Materiais | Peças | Triângulos | Observação |
|---|---|---|---|---|
| Eletrolar 20m² | 21 | — | 646.168 | traz a cúpula de céu do Enscape |
| Eletrolar 45m² | 18 | 2.710 | 3.581.342 | espelhado; 1.096 peças sobrepostas |
| **ECBR 45M** (atual) | 23 | 814 | 972.426 | 10,03 × 4,01 × 4,50 m; sem duplicatas |
| Sala de reunião | — | — | — | peça separada, para testar complemento |

A análise roda em 34–53 ms; a detecção de objetos, em 25 ms no pior caso.

### 6.2 Armadilhas do export SketchUp/Enscape

**A cúpula de céu.** O export de 20m² traz uma peça de 88 m envolvendo o estande,
chamada `COR DA PAREDE` — pela regra de nome viraria bagum personalizável. Por
isso **o tamanho veta o nome**, nessa ordem.

**Medir a peça, nunca o conjunto.** Este erro apareceu duas vezes:
- O veto de tamanho, medindo a união, descartava 10 materiais em vez de 3, porque
  as pranchas 2D espalham 7 painéis de bagum por 42 m. Passou a medir a
  **maior peça**.
- As regras de forma mediam a união: 28 painéis de 2,90 × 2,90 × 0,10 formam um
  conjunto de 10 × 3,9 × 8, cuja "espessura" é 8 m. Parede caía em mobiliário.
  Passou a medir a **peça mediana**.

**Nomes enganam.** `Aluminum` contém `lumin` e casava com a regra de iluminação;
`eames wood1` é cadeira, não madeira. Regras de mobiliário vêm antes das de
material, e a de iluminação usa fronteira de palavra.

**Tudo é DoubleSide.** Construir um material novo em folha para aplicar cor
descartava o `side` do arquivo e nascia FrontSide — a face do carpete, cujo lado
visível aponta para baixo, virava invisível por cima e **trocar a cor não mudava
nada**. Materiais de personalização são **clonados** do original.

**A maioria das peças não tem UV.** As peças de logo vêm sem nenhuma UV, e
textura em geometria sem UV não desenha nada — "apliquei arte e não aparece" era
literal. As que têm UV vêm com a escala de repetição do SketchUp (carpete de −12
a 12, madeira de −152 a 152), onde a arte se repetiria dezenas de vezes. A UV
para arte é **gerada na hora**, plana, sobre os dois maiores eixos da peça.

**A vertical não é o eixo Y da geometria.** A conversão de Z-para-cima para
Y-para-cima é feita girando a **raiz da cena**; dentro da geometria o eixo
vertical continua sendo o Z. Assumir Y punha a arte de cabeça para baixo em toda
peça. A vertical sai da matriz de mundo.

**A arte entra sem deformar.** Esticar é o que a impressão de lona faz, mas
destrói um logo — e logo é o caso mais comum. A imagem entra inteira e
centralizada; o que sobra fica com a cor escolhida.

### 6.3 CORS — e um erro de raciocínio meu

O `.glb` não carregava. Eu descartei CORS porque "o arquivo baixa direto pelo
link". **Esse raciocínio está errado:** navegação não passa por CORS, só
requisição feita por JavaScript. Era CORS.

O diagnóstico agora é conclusivo: quando o `fetch` estoura sem status, uma
segunda tentativa em `mode:'no-cors'` separa os casos — resposta opaca significa
que o servidor entrega mas não autoriza a leitura (é CORS), falha nas duas
significa servidor inalcançável (é rede).

A liberação do bucket **não existe na interface** do Firebase nem do Google
Cloud. A tela leva ao **Cloud Shell**, que roda no navegador, com o comando
pronto para copiar.

---

## 7. Infraestrutura e publicação

### 7.1 Restrição que molda tudo

> **O usuário do projeto não usa terminal.** Tudo precisa acontecer via
> GitHub Actions e Console.

Isso já causou um problema silencioso: por semanas o app subiu com regras novas
escritas no repositório e **regras antigas valendo no servidor**, porque publicar
regras dependia de alguém rodar um comando.

### 7.2 O workflow

`.github/workflows/deploy-studio.yml` publica, em passos separados e tolerantes
a falha, com um resumo final:

| Alvo | Como |
|---|---|
| Site | `FirebaseExtended/action-hosting-deploy` |
| Regras do Firestore | CLI |
| Regras do Storage | CLI |
| Cloud Functions | CLI, após `npm ci` em `studio/functions` |

Cada alvo vai num passo próprio **de propósito**: publicar tudo junto fazia uma
permissão faltante no Storage derrubar também as regras do Firestore.

O workflow também **liga sozinho a Cloud Billing API**, que a CLI consome sem
ligar por conta própria.

### 7.3 Firebase

- Projeto: **personalizacao-stand**, plano **Blaze**
- Região das Functions: **southamerica-east1**, Node 22, 2ª geração
- Functions: `excluirExpositor`, `definirSenhaProvisoria` — existem porque
  `deleteUser` no navegador só age sobre quem está logado, e sem elas o e-mail
  de um expositor excluído ficaria preso
- O app **funciona sem as Functions**: distingue "função ausente" de "função com
  erro" e cai no caminho do navegador, avisando o que resta fazer no Console

### 7.4 IAM — o que precisou ser concedido

A conta de serviço do deploy precisou de dois papéis, e a razão de serem dois
vale registro:

| Papel | Por quê |
|---|---|
| **Editor** | criar e atualizar recursos, publicar regras |
| **Cloud Run Admin** | Editor **não** permite alterar políticas de IAM, e é uma política de IAM que libera o navegador a chamar a função |

### 7.5 Branch

Todo o trabalho está em `claude/stand-personalizacao-brainstorm-075ofg`.
O push nessa branch dispara o deploy.

---

## 8. Mapa do código

```
studio/src/
├── lib/glb/
│   ├── analyze.js        lê a cena: materiais, peças, bbox, duplicatas, aglomerados
│   ├── roles.js          catálogo de papéis e a heurística de sugestão
│   ├── superficies.js    superfície: padrão, dividir, unir, medir
│   ├── objetos.js        detecção por contato, assinatura, preservação de ajustes
│   ├── complementos.js   peças opcionais: grupos, opções, alinhamento
│   ├── precos.js         as duas réguas e o orçamento
│   ├── arte.js           UV plana e encaixe sem deformar
│   └── nomes.js          nomes que o expositor entende
├── components/
│   ├── Viewer.jsx        canvas, realce, transformes, complementos, exposição
│   ├── GizmoObjeto.jsx   arrastar no chão e girar pelo anel
│   ├── Painel*.jsx       um painel por aba do admin
│   ├── MobiliarioExpositor.jsx / EscolhaComplemento.jsx   lado do cliente
│   └── Tutorial.jsx
├── pages/
│   ├── Modelos / Editor              mapeamento
│   ├── Clientes / Conta / TrocarSenha contas
│   ├── Expositor                     a tela do cliente
│   └── Propostas
└── functions/            Admin SDK: excluir login, senha provisória
```

---

## 9. Modelo comercial do sistema

**Esta seção registra a conversa, não uma decisão fechada.** Os números precisam
ser refeitos com custo real de operação antes de virar proposta.

Três modelos foram discutidos:

| Modelo | A favor | Contra |
|---|---|---|
| Por usuário | simples de explicar | pune o sucesso: quanto mais expositores, mais caro, e o custo marginal real é quase zero |
| Por projeto / feira | casa com o trabalho real, que é configurar o projeto | precisa de um piso, senão feira pequena não paga o setup |
| Percentual das vendas | alinha incentivo | exige auditoria de faturamento e atrito comercial |

**Direção recomendada:** licença por feira (recorrente, cobre a operação) +
valor por configuração de projeto (cobre o trabalho de mapeamento, que é real e
varia com o arquivo). O percentual funciona como upside opcional, não como base.

O ponto que sustenta a cobrança por configuração: mapear um projeto é trabalho
humano que depende da qualidade do `.glb` recebido. Um arquivo com peças bem
definidas leva minutos; um com cadeira em pernas, tampo e parafusos soltos leva
bem mais.

---

## 10. O que falta

### 10.1 Fase 2 — biblioteca de mobiliário

Combinado e adiado. O admin sobe `.glb` de mobiliário avulso; o cliente escolhe
da lista para **incluir**, **substituir** ou **excluir** móveis. É onde a régua
de preço por peça finalmente ganha uso pleno.

### 10.2 Pendências imediatas

- **Testar a `Sala_de_reuniao.glb` como complemento.** O arquivo já foi enviado
  e a conferência de alinhamento contra o estande ainda não foi rodada.
- **Cartela de cores oficial.** A atual é de teste (16 cores genéricas). Falta a
  tabela real de napas e carpetes, com código e nome comercial.
- **Ajuste fino do ciclorama.** O fundo do 3D foi de escuro demais para branco
  estourado e agora está num degradê. Pode precisar de mais um passo.
- **Nomes dos objetos.** Ainda saem como "Mobiliário 3" quando não há superfície
  renomeada cobrindo o objeto.

### 10.3 Coisas que o produto ainda não faz

- **Pagamento pela ferramenta.** Deliberadamente fora do escopo por enquanto; a
  proposta sai em PDF e o fechamento é fora do sistema.
- **Envio automático da proposta por e-mail.** Hoje é imprimir para PDF pelo
  navegador. Quando virar envio automático, isso passa para o servidor.
- **Escala multi-feira na interface.** O modelo de dados já suporta vários
  projetos e feiras, mas não existe uma tela de gestão de feiras, nem
  agrupamento de modelos por feira, nem licenciamento no produto.
- **Peso no celular.** Um arquivo de 3,5 milhões de triângulos é pesado. O
  admin recebe um aviso, mas não há redução automática de malha.
- **Histórico de versões da proposta.** Hoje cada gravação cria um registro
  novo, sem vínculo entre revisões do mesmo expositor.

---

## 11. Decisões que já foram tomadas e não convém reabrir

Registradas para não serem redecididas por engano:

1. **Superfície e objeto são coisas separadas.** Unir cadeiras para pintar não
   pode destruir a capacidade de movê-las em separado.
2. **As permissões são explícitas e do admin.** A heurística só semeia o valor
   inicial. A partir do primeiro clique do admin, a decisão é dele e não é
   desfeita por mudança de papel.
3. **O mobiliário do projeto está incluso no valor.** Abrir a ferramenta e não
   mexer em nada tem que dar zero.
4. **A tela do expositor não mostra vocabulário técnico.** Nem nome de material,
   nem papel, nem contagem de peças.
5. **Girar não usa a roda do mouse.** A roda é o zoom; tomá-la tiraria a
   aproximação necessária para encaixar a peça, e no trackpad dispararia
   sozinha no meio do arrasto. Girar tem anel próprio.
6. **Complementos são perguntas independentes, nunca combinações enumeradas.**
7. **Só o agrupamento manual do admin é atômico para objetos.** Tratar toda
   superfície como atômica destrói a detecção.
8. **Nada depende de terminal.** Se uma etapa nova precisar de comando, ela
   entra no workflow.

---

## Apêndice — o que conferir quando chegar um `.glb` novo

Um roteiro curto, derivado dos problemas que já apareceram:

1. Quantos materiais? Se passar de ~30, o mapeamento vai doer.
2. Tem peça maior que 30 m? É céu de render ou prancha 2D — descartar.
3. Tem duplicatas? Se sim, a metragem depende da deduplicação.
4. O estande está espelhado ou repetido? Se sim, o recorte é obrigatório.
5. As peças de arte têm UV? Provavelmente não — a geração planar cobre.
6. O mobiliário veio em peças soltas? Agrupar na aba Superfícies antes de
   liberar movimento.
7. Rodar a Prévia antes de liberar para o expositor.
