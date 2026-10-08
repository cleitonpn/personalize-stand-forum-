# Operação USET

## Acesso e responsabilidade

Admin cadastra acessos em **Equipes → Acessos da operação**. Selecione função e feiras. Gestão vincula equipes e responsáveis dentro do estande. Produtor e atendimento só veem estandes atribuídos individualmente ou às suas equipes; equipe de produção só vê estandes com sua equipe; demais perfis ficam restritos às suas feiras. Todos usam Firebase Auth individual, sem copiar o sistema de PIN do CAS.

| Função | Permissões |
| --- | --- |
| Admin | Todas as feiras; aprovar propostas, cadastrar acessos, distribuir e validar serviços |
| Gerente operacional | Gerir equipes e estandes, atribuir responsáveis, validar/reabrir serviços e montagem, relatórios das suas feiras |
| Analista operacional | Gestão operacional das suas feiras, incluindo equipes e validação |
| Analista de projeto | Consultar projetos, fotos e relatórios; registrar orientações; sem execução ou validação |
| Produtor | Consultar estandes atribuídos diretamente ou via equipe; abrir chamados, executar serviços e solicitar validação da montagem |
| Atendimento comercial | Consultar estandes atribuídos diretamente ou via equipe, abrir chamados e aprovar/recusar solicitações da organizadora; sem execução/validação |
| Mobiliário | Consultar suas feiras e executar chamados de mobiliário; sem validar |
| Analista de CV | Conferir artes, publicar provas e registrar impressão; executar chamados de CV; sem validar montagem |
| Equipe de produção | Consultar estandes atribuídos à equipe, abrir chamados e executar serviços da própria equipe |

As mesmas restrições são verificadas em Functions, Firestore e Storage. As telas apenas refletem essas permissões.

## Proposta e produção

A aprovação comercial gera a ordem e trava a personalização do cliente. Ele mantém acesso à consulta do GLB aprovado, artes finais, provas e chat. Novos envios de proposta para o mesmo projeto/feira são recusados no servidor enquanto a ordem estiver liberada. Para revisar, admin deve recusar/suspender a proposta, com motivo, antes de solicitar novo envio. A substituição de uma aprovação anterior exige confirmação e gera revisão; pendências antigas permanecem identificadas.

## Pendências

Registro com descrição, equipe, responsável, prioridade, origem, itens de mobiliário da proposta e fotos opcionais. Solicitações originadas da organizadora passam primeiro pela aprovação do atendimento/gestão. Fluxo: **aberta → em execução → executada/aguarda validação → concluída**. Gestão pode validar em lote, reabrir com motivo, editar descrição/responsável/prioridade e redistribuir equipes. Executor e validador têm registros separados. Fotos de abertura e execução usam reservas de upload privadas, imutáveis, até 12 por fase e 15 MB por foto. Não há URL pública permanente.

Montagem só pode ser concluída quando as pendências da revisão estiverem concluídas ou recusadas. Produtor solicita validação; gestão valida ou reabre com motivo. Fotos gerais de montagem ficam nos anexos do estande. Orientações dos analistas permanecem no histórico. Validação automática é opcional por feira e começa desabilitada; quando habilitada, conclusões de serviços registram explicitamente que foram automáticas.

## Relatórios

Em **Relatórios da produção**, filtros por feira, situação, equipe, executor, empresa/serviço e período; revisões anteriores são opcionais. Contagem de abertos, executados, concluídos e recusados; distribuição por equipe e ranking de conclusões por executor. Exportação PDF e CSV funciona na web e pelo compartilhamento de arquivos do Android. PDF registra notas e quantidades de fotos; imagens são consultadas no registro privado. O período usa validação, execução ou criação, nesta ordem. Relatórios respeitam os estandes autorizados e carregam automaticamente em páginas de 100 estandes, permitindo consultar uma feira com 300 ou mais estandes.

## Referência CAS

Foi estudado somente em leitura o repositório Pendencias-cas-2026: perfis, cadastro de pendências, autorização comercial, execução/validação, fotos, considerações dos analistas, montagem e relatórios. Esses fluxos foram adaptados à proposta aprovada e às contas individuais do Studio, mantendo a estética USET. Módulos independentes do CAS (presença, fretes, reuniões, cronograma de obra e QR de solicitações públicas) não fazem parte desta migração dos fluxos de pendências. O repositório CAS não foi alterado e seus registros não foram importados.

## Verificação local

`npm test`, `npm run build` e `node scripts/qa-operacao.mjs` com emuladores demo-uset. Portas padrão seguem firebase.test.json; QA_AUTH_PORT, QA_FIRESTORE_PORT, QA_STORAGE_PORT e QA_FUNCTIONS_PORT permitem usar uma suíte isolada. QA cria apenas contas sintéticas. Inclui bloqueio comercial, isolamento por feira/equipe/responsável, fotos privadas e imutáveis, prova/impressão CV, autorização do atendimento, execução, validação em lote/automática, conclusão da montagem, relatórios e revisão/suspensão.

Gerar o APK pelo workflow **APK USET Produção** após atualizar o código: alterações de frontend precisam de um APK novo. Upload de câmera, compartilhamento e push também precisam de homologação no aparelho.

## Distribuição por blocos
Em Produção, selecione a feira e abra Distribuir equipes por bloco. Crie um nome e marque manualmente os estandes, ou selecione os resultados do filtro de busca. Atribua uma ou mais equipes; o padrão acrescenta às existentes, com opção explícita de substituição. Blocos são reutilizáveis e ajustes individuais continuam disponíveis. Até 400 estandes por envio, processados em grupos de 40 com revisão e permissão conferidas em cada transação. Caso um grupo falhe, a tela informa quais estandes foram alterados e quais precisam ser revistos. Atribuições são auditadas e geram um aviso por usuário, evitando um push para cada estande.

