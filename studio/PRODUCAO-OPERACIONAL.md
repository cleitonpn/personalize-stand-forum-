# Produção operacional

O módulo usa a mesma autenticação e o mesmo backend do Studio. O repositório Pendências CAS permanece apenas como referência, sem alterações.

## Uso

1. Admin cadastra acessos em **Equipes → Acessos da operação** e escolhe feiras e papel.
2. Gerente ou analista operacional cadastra equipes, integrantes, responsável, telefone e instruções. Os integrantes precisam ter acesso às feiras atendidas pela equipe. Anexos ficam junto da equipe ou do estande.
3. Admin abre uma proposta e usa **Aprovar e liberar produção**. Esta decisão é independente da liberação comercial anterior e da aprovação da prova de arte.
4. **Produção** mostra a configuração completa, incluindo móveis e acabamentos originais, adicionais, retiradas, substituições, posições, artes e pontos elétricos. Não mostra preços aos acessos operacionais.
5. Gerente/analista atribui equipes à ordem. Usuários de campo só consultam estandes das próprias equipes e feiras.
6. CV das feiras autorizadas confere medidas e arquivos, devolve com motivo, envia provas, define prazo e registra impressão. O cliente aprova a prova atual. Os demais perfis operacionais consultam, sem alterar artes.
7. Pendências seguem aberta → em execução → executada aguardando validação → validada. Apenas gestores validam ou devolvem para ajuste.

## Versões e autorização

Novas propostas recebem `manifestoProducao` no envio, calculado no servidor com o mapeamento daquela revisão. Aprovar cria `ordensProducao`, sem valores comerciais, e um espelho de autorização `acessosProducao`. Uma nova proposta aprovada para o mesmo expositor/feira substitui a anterior somente com confirmação do admin; a revisão antiga é preservada. Suspensão e substituição revogam acesso aos GLBs e artes antigos para os perfis operacionais. Não são geradas ordens duplicadas ao repetir uma aprovação.

Propostas anteriores a esse registro exigem conferência manual explícita do GLB e do mapeamento atual, com indicação de origem legada na produção. Não é possível reconstruir automaticamente um mapeamento histórico que nunca foi salvo.

O GLB permanece imutável. As artes mantêm versões e provas próprias; trocar uma prova invalida a anterior. Uma pendência de revisão antiga não pode ser validada como serviço da nova configuração. Anexos são privados, reservados no servidor, imutáveis e associados à revisão vigente no envio.

## Vistas e Android

Produção abre o GLB final e gera frente, elevação lateral, planta baixa e isométrica por projeção ortográfica. O gestor pode anexar as quatro imagens à ordem. São vistas sem cotas técnicas; posição frontal segue o eixo frontal do projeto. A geração exige abrir o GLB online em um dispositivo com WebGL. Arquivos anexados podem ser baixados para consulta externa; não há promessa de sincronização offline da operação nesta entrega.

`capacitor.config.json` e `android/` preparam o APK `br.com.uset.producao`, com o mesmo frontend e permissões. A implementação diferencia push web e FCM nativo e usa arquivos em cache e compartilhamento Android para downloads.

Para homologar o APK: cadastrar esse pacote como app Android no projeto Firebase `personalizacao-stand`, fornecer `google-services.json` em `studio/android/app/` (ignorado pelo Git) e configurar o secret `FIREBASE_ANDROID_GOOGLE_SERVICES` para o workflow **APK USET Produção**. A CLI Firebase local retornou 401 em 08/10/2026; a configuração remota não foi criada. A máquina local também não possui SDK Android/JDK de compilação. O workflow instala ambos e gera um APK debug para teste. Assinatura de distribuição e teste em aparelho real ainda são necessários antes de entregar um APK de produção.

Os convites operacionais ficam em `emailsSaida`, aguardando integração do provedor; não há envio real de e-mail nesta entrega.

## Verificação

`npm test`, `npm run build`, `node scripts/qa-operacao.mjs` contra os emuladores definidos em `firebase.test.json`. O teste integrado verifica aprovação, itens originais, isolamento por feira/equipe, ausência de valores para CV, anexos protegidos, restrição de validação, revisão e suspensão. Os testes nunca operam no projeto Firebase de produção.
