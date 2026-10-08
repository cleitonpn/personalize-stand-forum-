# Personalização e app irmão da produção

O Studio concentra projetos, catálogos, preços, expositores, organizadoras,
propostas, aprovação comercial, artes finais, provas, impressão, chat e avisos web.

Equipes, blocos, responsáveis pela montagem, pendências, fotos de campo e
relatórios operacionais serão gerenciados pelo app irmão baseado no Pendências CAS.
O novo repositório e sua API ainda serão implementados; esta alteração apenas
retira o app anterior e preserva a base de integração.

## Configuração aprovada

- `registrarProposta` grava `manifestoProducao` com itens originais, inclusões,
  substituições, retiradas, acabamentos, posições, áreas de arte e elétrica.
- `decidirProposta`, exclusivo do admin, aprova ou suspende a configuração.
- A aprovação mantém uma versão em `ordensProducao`, com referência ao GLB
  privado e à proposta. Alterações anteriores ficam em `revisoes`.
- `estadoPersonalizacao` e `registrarProposta` mantêm o bloqueio das alterações
  do expositor após aprovação. Artes e chat continuam disponíveis.
- O fluxo de CV e os estados `em_impressao`/`impressa` permanecem no Studio.
  `listarArtesEquipe` devolve apenas resumos aprovados das feiras do analista CV;
  não entrega preços, propostas de outras feiras ou distribuição de equipes.

## Retirada do app anterior

As telas de produção, equipes e relatórios, o projeto Android, o Capacitor e o
workflow de APK foram retirados deste repositório. Links antigos levam a uma
página explicativa, sem conduzir os perfis de campo ao configurador do cliente.

A Function publicada `operacao` permanece como endpoint desativado: exige login
e recusa todas as ações, inclusive distribuição de equipes e blocos. Isso impede
que um APK antigo continue gravando depois da retirada da interface. Registros
push Android antigos não são usados para novas entregas nem novos cadastros.
Notificações push do navegador continuam funcionando.

Nenhuma conta, proposta, ordem, equipe, bloco, pendência ou foto existente foi
apagada do Firebase. Os registros antigos da operação e seus arquivos estão
somente para leitura do admin. Os perfis de campo precisam da futura integração
do app irmão; suas antigas permissões de equipe não abrem os dados do Studio.
Metadados de campo já existentes nas ordens são preservados em novas revisões,
mas o Studio não cria novas distribuições.

O projeto Android local foi arquivado fora deste repositório, incluindo a
configuração Firebase local. O secret Android e o cadastro do app Firebase não
foram removidos; poderão ser revistos ao configurar o app irmão.

## Verificação

`npm test` e `npm run build`. Com emuladores do projeto `demo-uset`, executar
`node scripts/qa-aprovacao.mjs`: registro do GLB, aprovação, bloqueio comercial,
isolamento de CV, gabarito, upload, prova, impressão, suspensão, histórico e
recusa de ações do APK antigo. As portas podem ser configuradas por
`QA_AUTH_PORT`, `QA_FIRESTORE_PORT`, `QA_STORAGE_PORT` e `QA_FUNCTIONS_PORT`.
