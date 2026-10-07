# Notificações, franquia e mapeamento de produção

## Admin
- Projetos → mapear elemento → “Medidas da arte e gabarito deste projeto”: conferir largura/altura em cm, tipo de impressão, sangria e margem em mm; confirmar e salvar o projeto.
- Elemento “Logo / placa”: não gera gabarito. Continua com prova da aplicação e aprovação obrigatória antes de impressão.
- Preços → escolher projeto → Arte incluída no pacote: selecionar as áreas elegíveis e a franquia total em m². Arte deve ter preço por m². O saldo é compartilhado e beneficia primeiro áreas de maior preço; a ordem de cliques não altera o total.
- A metragem de uma mesma área dividida em materiais não é somada duas vezes. Balcões usam a face frontal. Medidas confirmadas prevalecem sobre estimativas geométricas.
- Propostas → Liberar proposta e notificar cliente. Pagamento mantém sua aprovação financeira própria.

## Cliente
- Avisos → Ativar e testar push: autorização individual por dispositivo. No iPhone/iPad, adicionar à Tela de Início e abrir como aplicativo. Não há cache offline de documentos privados.
- Ao sair, assinatura push e notificações abertas neste dispositivo são removidas. Em outro dispositivo, a ativação permanece.
- Artes e aprovação → proposta: gabaritos de áreas confirmadas já aparecem. Dimensões da proposta são uma cópia do mapeamento no momento do envio; editar o projeto não altera propostas antigas.
- Arquivos de apoio: PDF, AI compatível com PDF, EPS, SVG, PNG/JPG até 30 MB. Vetores EPS/SVG são baixados; não executamos nem exibimos SVG arbitrário no app. Arquivos privados, somente criação, com validação de formato e hash pelo servidor.
- Logos: produção seleciona o material de apoio ao preparar a prova; essa versão conserva os arquivos utilizados. Upload posterior não muda uma prova aprovada.

## Backend
- `notificacoesUsuario`: chave pública VAPID, registro/desativação de assinaturas, leitura e teste. A chave privada está em `configuracaoPrivada/webpush`, inacessível ao navegador.
- Avisos e fila são gravados na mesma transação da mudança. Destinatários: cliente ou admin + organizadora responsável, sem avisar o autor. Chat e liberação comercial têm chaves idempotentes.
- Eventos: nova proposta, liberação, aprovação do valor, mensagens, confirmação do gabarito, prazo de artes, novo arquivo de arte/apoio, prova, pedido de ajustes, aprovação/reprovação da prova e impressão.
- Entrega por Web Push padrão com VAPID. Endpoints HTTPS de provedores conhecidos. 404/410 remove assinatura expirada. Retentativas até 6, com fila e Cloud Scheduler a cada 5 minutos. Dispositivos que já receberam não são reenviados na mesma tentativa.
- Firestore indexes: notificações por destinatário/data e fila por status/próxima tentativa. Publicação inclui os índices.
- Storage: escrita consulta somente perfil e reserva de upload autorizada pelo backend. Não consultar também proposta: Cloud Storage limita avaliações a dois documentos Firestore. Leitura mantém validação de perfil/proposta. Finalização revalida acesso no servidor.
- Arte pendente também consome franquia. O servidor aplica o saldo usando medidas e preços do projeto, preservando a configuração na proposta. Outros valores continuam sujeitos à aprovação comercial antes da cobrança.

## Validação
`npm test`, `npm run build`, `node scripts/qa-artes.mjs` e `node scripts/qa-comercial.mjs` (emuladores demo-uset). Nos emuladores a entrega externa de push é simulada; recebimento pelo sistema operacional depende de ativação e teste no dispositivo real.
