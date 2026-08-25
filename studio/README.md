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

Publique as regras antes de usar:

```bash
npx firebase deploy --only firestore:rules,storage --project personalizacao-stand
```

## Cloud Functions (opcional)

Duas operações não existem no navegador porque exigem o Admin SDK:

- **excluir o login** de um expositor — `deleteUser` no cliente só age sobre
  quem está logado, então sem função o e-mail fica preso e não pode ser
  cadastrado de novo;
- **definir uma senha provisória** direto, para quando o e-mail de redefinição
  não chega (caixa corporativa costuma barrar).

O app funciona sem elas: a exclusão apaga o perfil, o acesso é bloqueado, e a
tela avisa o que resta fazer no Console. Publicar exige o **plano Blaze** do
Firebase (o uso aqui cabe na cota gratuita, mas o plano pede cartão).

```bash
cd studio/functions && npm install
cd .. && npx firebase deploy --only functions --project personalizacao-stand
```

## Deploy

Automático pelo workflow `.github/workflows/deploy-studio.yml` (usa o secret
`FIREBASE_SERVICE_ACCOUNT`), disparado só quando `studio/**` muda.
