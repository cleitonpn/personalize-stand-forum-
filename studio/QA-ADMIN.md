# Administração e registro 3D

As alterações desta rodada incluem identidade visual USET no admin, preços por elemento, biblioteca compartilhada de mobiliário, análise de uso, GLB personalizado por proposta e reinício da personalização.

## Verificação local isolada

1. Execute `firebase emulators:start --project demo-uset --only "auth,firestore,storage" --config firebase.test.json` em `studio/` (Java 21).
2. Execute `node scripts/qa-emuladores.mjs`. O script usa apenas localhost e o projeto demo-uset. Cria contas fictícias, dois projetos e fixtures em `dev/qa.local/`, que não entram no build. Também testa negação de acesso entre clientes, escrita de métricas inválidas, biblioteca restrita ao admin e imutabilidade do arquivo de propostas.
3. Inicie Vite com `VITE_EMULATORS=1` na porta 4501. Em PowerShell: `$env:VITE_EMULATORS='1'; npm run dev -- --host 127.0.0.1 --port 4501 --strictPort`.
4. Use `admin@uset.test` ou `cliente@uset.test`, senha `SomenteQA2026!`. São credenciais apenas dos emuladores. A opção de emuladores é ignorada nos builds de produção.

Se Java no Windows falhar ao criar a conexão local, defina `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<diretório local existente>` antes de iniciar os emuladores.

## Fluxos de aceitação

- Cadastre `dev/qa.local/mesa.glb` na biblioteca, selecione todos os projetos e disponibilize o móvel. Repetir não deve criar outra opção nem apagar ajustes locais.
- Em Preços, escolha um projeto, defina valores distintos para cor e arte, inclua uma regra com valor zero e salve. O cliente deve ver o mesmo valor antes da escolha e no total.
- Abra o editor em uma aba e altere os preços em outra. O editor antigo deve recusar salvar até ser recarregado.
- Como cliente, altere uma parede, acrescente e mova um móvel, aplique uma imagem ao balcão e envie. O admin deve abrir e baixar o GLB com a cor, imagem incorporada, posições e itens visíveis do envio.
- Propostas anteriores ao recurso exibem que não há GLB registrado; o modelo original não é apresentado como se fosse o personalizado.
- Reinicie: cancelar mantém as escolhas; confirmar restaura cores, artes, itens, pontos elétricos, móveis, histórico e primeira etapa. Recarregar deve manter a base restaurada. Propostas enviadas são preservadas.
- Consulte Análise de uso após interagir por pelo menos 20 segundos. O admin vê sessões; o cliente não pode consultar métricas. A opção de desativar coleta deve impedir novos lotes.

## Limites explícitos

- As métricas são agregadas em lotes de 20 segundos; fechar o navegador pode perder o último lote. Tempo, retornos e sessões sem envio são sinais para investigar, não prova de dificuldade. A consulta usa no máximo 1.000 sessões recentes do período escolhido e só calcula a pontuação com cinco sessões por etapa.
- Relacionar mobiliário usa uma cópia da configuração por projeto. Ajustes posteriores de preço e substituição são feitos no projeto, sem alterar os demais.
- O GLB contém geometria, materiais e imagens incorporadas, sem grades e controles da interface. Pontos elétricos são nós nomeados com metadados; a proposta mantém a lista para produção. Malhas animadas com esqueleto exigem versão estática. O limite por arquivo é menor que 200 MB.
- Publicação requer Hosting, regras de Firestore e regras de Storage da mesma revisão. Nenhuma conta ou fixture de teste deve ser criada em produção.
