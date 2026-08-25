# USET Stand Studio

App multi-modelo: sobe um projeto de estande em `.glb`, identifica as superfícies
que o expositor pode personalizar e (próxima etapa) serve o configurador.

Convive com o protótipo do Fórum E-commerce, que continua na raiz do repositório
e no GitHub Pages. Este app é independente e vai para o Firebase Hosting.

## Rodar local

```bash
cd studio
npm install
npm run dev
```

## Como o ingest funciona

Os projetos reais (SimLab/SketchUp + Enscape) chegam com dezenas de milhares de
nós e nomes inúteis (`Geom3D`, `Componente#51`, sem nome). O que é semântico são
os **materiais** — 18 a 21 por arquivo. Então o fluxo é:

1. **Upload** do `.glb` para o Firebase Storage.
2. **Análise** no navegador: agrupa as peças por material, calcula bounding boxes
   em espaço-mundo, acha geometria duplicada e mapeia as regiões ocupadas.
3. **Mapeamento**: o admin dá um papel a cada material (bagum, lona, piso,
   vidro, mobiliário…). Um material classifica milhares de peças de uma vez.
4. **Recorte**: define a área que é o estande de verdade. Necessário porque os
   arquivos costumam trazer mais coisa junto — cópia espelhada do estande,
   pranchas 2D do SketchUp, caixa de céu do Enscape.

### Limites conhecidos

- A detecção de regiões acha conteúdo **distante** (pranchas, céu), mas não
  separa um estande espelhado: as metades se encostam e formam uma região só.
  Para esse caso use os divisores manuais na aba "Área do estande".
- Os papéis sugeridos são heurística (nome do material + geometria). Sempre
  revise — o admin manda.

## Firebase

- `firestore.rules` / `storage.rules` — o papel do usuário vive em
  `/usuarios/{uid}.papel` e **nunca** pode ser escrito pelo cliente. Para criar
  um admin, edite o documento pelo Console do Firebase.
- A config web em `src/lib/firebase.js` é pública por definição (vai no bundle).
  Quem protege os dados são as regras, não esconder essas chaves.

As regras são publicadas **automaticamente** pelo workflow a cada push em
`studio/**` — não é preciso rodar comando nenhum.

## Cloud Functions (opcional)

Duas operações não existem no navegador porque exigem o Admin SDK:

- **excluir o login** de um expositor — `deleteUser` no cliente só age sobre
  quem está logado, então sem função o e-mail fica preso e não pode ser
  cadastrado de novo;
- **definir uma senha provisória** direto, para quando o e-mail de redefinição
  não chega (caixa corporativa costuma barrar).

O app funciona sem elas: a exclusão apaga o perfil, o acesso é bloqueado, e a
tela avisa o que resta fazer no Console.

O workflow tenta publicá-las a cada push, mas **elas exigem o plano Blaze** do
Firebase (o uso aqui cabe na cota gratuita; o plano é que pede cartão). Enquanto
o projeto estiver no plano gratuito esse passo falha de propósito sem derrubar o
resto do deploy, e o workflow deixa um aviso dizendo isso. Basta mudar o plano
no Console para que o próximo push publique as funções.

## Deploy

Tudo automático pelo workflow `.github/workflows/deploy-studio.yml`, disparado
quando `studio/**` muda. Ele usa o secret `FIREBASE_SERVICE_ACCOUNT` e publica,
nesta ordem: o site (Hosting), as regras do Firestore e do Storage, e as Cloud
Functions. Nenhuma etapa exige terminal.

Se a conta de serviço não tiver permissão para publicar regras, o passo falha
com a mensagem do Google dizendo qual papel falta — normalmente
`Firebase Rules Admin`, concedido no IAM do projeto.
