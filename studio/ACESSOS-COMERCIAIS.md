# Acessos, organizadoras e cobrança

O admin cadastra organizadoras, cria feiras e vincula os projetos. Depois cadastra o expositor com empresa, e-mail e os vínculos internos de feira/projeto. Contas e vínculos são criados nas Cloud Functions; o navegador não pode criar perfis ou conceder papéis.

A organizadora consulta seus projetos em modo de visualização, seus expositores e propostas. Pode preencher a localização do estande, mas não alterar o projeto, preços, valor da proposta, papel ou vínculos do expositor. As regras do Firestore e Storage verificam o vínculo, inclusive em consultas diretas pela API.

No primeiro acesso de uma conta nova, são obrigatórios nome do responsável e telefone. Cargo e localização são opcionais. A ausência de localização gera uma pendência para a organizadora. Contas anteriores são preservadas; o admin usa “Vincular feira e projeto” para relacioná-las. Propostas antigas não recebem uma organizadora por inferência, preservando seu histórico e evitando atribuições indevidas.

## E-mail (API pendente)

O cadastro produz um link de definição de senha e um documento em `emailsSaida`, com `tipo`, `para`, `destinatarioId`, `assunto`, `texto`, `status=pendente_integracao` e data. A fila é privada do admin/backend. Senhas não são armazenadas. O admin pode copiar o convite e entregá-lo enquanto não houver provedor.

Ao integrar a API, implementar um consumidor da fila que reserve cada mensagem em transação, use o ID como chave de idempotência, escape os dados ao gerar HTML e registre `enviadoEm`, identificador do provedor e erros sem incluir links secretos nos logs. Não marcar como enviado antes de o provedor aceitar. Convites vencidos devem ser regenerados pelo Admin SDK. Os e-mails nativos de recuperação de senha continuam pelo Firebase Authentication.

## Pagamento (provedor ainda não escolhido)

`organizadoras.cobranca` aceita `montadora` ou `organizadora`. No modo organizadora, a proposta é consultada no painel e a equipe entra em contato com o expositor. No modo montadora, o admin aprova um valor em centavos na proposta; `pagamentos/{propostaId}` registra cliente, organizadora, feira, moeda, valor aprovado e `status=aguardando_integracao`. Esta estrutura não emite boletos, Pix, links ou cobranças reais.

A integração futura deve criar checkout no servidor com o valor aprovado, idempotência por proposta, identificação do provedor e vencimento. Confirmar pagamento somente por webhook com assinatura validada e consulta ao provedor. Nunca aceitar `status=pago` ou o valor enviado pelo navegador. Não armazenar dados de cartão. O valor da proposta é estimativo do cliente; a aprovação administrativa é o valor autorizado para cobrança.

## Métricas e proteção de arquivos

Métricas comerciais mostram valores propostos e quantidade de elementos personalizados, inclusões e pontos elétricos, considerando apenas o último envio por expositor/feira/organizadora. Personalizações gratuitas entram na quantidade. Contagens ausentes em propostas antigas são indicadas, sem inventar números. Esses totais não são faturamento recebido.

O carregador GLB usa download autenticado. `arquivosModelo` contém a união dos projetos e organizadoras que usam cada GLB, atualizada em transações quando o modelo muda. O deploy executa `functions/migrar-acessos.js` após o Hosting para criar os acessos dos arquivos existentes e revogar links públicos permanentes de GLBs de projetos/propostas. Imagens de acabamentos do catálogo permanecem compartilhadas; a revogação não afeta essas texturas.

A remoção dos tokens em produção usa a semântica de exclusão de metadata com `null` da [API oficial do Cloud Storage](https://docs.cloud.google.com/storage/docs/json_api#semantics_of_a_patch_request), seguida de releitura para confirmar a remoção. O emulador mantém os tokens numa lista interna separada e precisa de seu endpoint local de revogação; essa adaptação só executa quando `FIREBASE_STORAGE_EMULATOR_HOST` está definido.

Projetos e propostas são gravados por funções HTTPS autenticadas. O servidor valida a versão dos preços, sincroniza os acessos a arquivos após salvar projetos/vínculos e revoga os links do GLB antes de registrar a proposta. Não são necessários gatilhos Eventarc nem novas concessões de IAM para esse fluxo.

## Verificação local

Iniciar emuladores com `firebase emulators:start --project demo-uset --only auth,firestore,storage,functions --config firebase.test.json`. Executar `node scripts/qa-comercial.mjs` para testar cadastros por callable, duas organizadoras, tentativas de acesso cruzado e alteração de vínculos, cadastro inicial, localização pendente e aprovação de pagamento. Também executar `npm test`, `npm run build` e `node scripts/qa-emuladores.mjs`.

As contas locais `admin@comercial.test`, `org@comercial.test` e `cliente@comercial.test` usam `TesteComercial2026!`, exclusivamente no projeto demo. Não são contas de produção.
