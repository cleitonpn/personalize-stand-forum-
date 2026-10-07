# Artes finais e atendimento

## Expositor

- Depois de enviar a proposta, acesse **Artes e aprovação**. Cada proposta
  mantém suas próprias áreas, arquivos e decisões.
- A USET confere as dimensões inferidas pelo GLB, o tipo de impressão, a sangria
  e a margem antes de liberar o gabarito.
- Baixe o PDF de duas páginas: ficha de medidas e gabarito vetorial. O PDF
  informa a escala quando o tamanho ultrapassa o limite de página.
- Envie PDF, AI compatível com PDF, PNG ou JPG de até 300 MB por área. O arquivo
  do configurador 3D é uma prévia; o envio de produção acontece nesta tela.
- A conferência local verifica dimensões, proporção, escala 1:1/1:2/1:4/1:10,
  densidade no tamanho final, sangria e outros requisitos. O arquivo recusado
  pelo diagnóstico pode ser enviado à revisão humana com uma justificativa.
- Confira a prova enviada pela USET. Aprove a versão atual ou explique o ajuste.
  Uma nova arte, um novo gabarito ou uma nova prova invalidam o aceite anterior.
- **Falar com a equipe** abre a conversa durante a personalização ou o envio.
  Mensagens enviadas na tela de artes referenciam a proposta correspondente.

## Admin e organizadora

Em **Propostas → Gabaritos, artes finais e aprovação**, o admin confirma medidas,
define ou estende prazos, confere arquivos, devolve com orientação e envia provas
em PDF/PNG/JPG de até 30 MB. A impressão só é liberada após a aprovação da prova
atual pelo expositor. O histórico conserva artes e provas anteriores e decisões
com usuário, papel, versão e data do servidor.

A organizadora acompanha as propostas e arquivos dos seus próprios expositores
e pode atender pelo chat. Somente o admin altera medidas e controla a produção.
**Atendimento** reúne conversas com indicação das que aguardam resposta; também
permite iniciar uma conversa com um expositor vinculado. O chat oferece histórico
paginado, mensagens em tempo real e indicação de mensagem ainda não lida.

## Medidas e segurança

O GLB usa metros. Os vértices são projetados na base da face para medir paredes
inclinadas; balcões usam a mesma projeção frontal da arte. Superfícies do mesmo
elemento físico compartilham um gabarito. Medidas são sugestões até a conferência:
o GLB não descreve automaticamente recortes de produção, emendas ou margens de
montagem. Peças não retangulares exigem a orientação da produção.

Nenhuma aprovação depende do diagnóstico enviado pelo navegador. O servidor
confere vínculos, versão, revisão do gabarito, assinatura e hash do arquivo.
Uploads exigem reserva autenticada de uma hora e são imutáveis. Downloads usam
Storage autenticado, sem URLs permanentes públicas. Regras isolam propostas e
conversas entre contas e organizadoras; escritas passam por Functions HTTPS.

A proposta guarda as áreas escolhidas e suas medidas estimadas no momento do
envio. Propostas anteriores usam os IDs de acabamentos e medidas do projeto
quando disponíveis, sempre com confirmação manual antes de produção.

## Validação

`npm test` cobre geometria, união de materiais, escala, resolução, gabaritos PDF
e transições de aprovação. `node scripts/qa-artes.mjs`, com os emuladores de
`firebase.test.json`, verifica o fluxo real de Functions/Firestore/Storage,
incluindo acessos negados, arquivos imutáveis, provas antigas e chat. O script
usa somente `demo-uset`, sem dados ou contas de produção.

Origem da análise reutilizada: `src/lib/producao/ORIGEM.md`. O repositório de
aprovação de arte foi apenas consultado e não recebeu alterações.
