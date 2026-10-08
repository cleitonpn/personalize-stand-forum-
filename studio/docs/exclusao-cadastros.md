# Exclusão de cadastros

Somente o admin pode excluir usuários, feiras e organizadoras. As telas mostram o impacto e exigem digitar o e-mail do usuário ou o nome do cadastro antes de confirmar. A própria conta não pode ser excluída.

Em **Usuários e acessos → Gerenciar acesso → Excluir usuário**, o servidor bloqueia o perfil, arquiva o cadastro para auditoria, remove o login do Firebase Authentication, cancela convites pendentes e elimina assinaturas push. O e-mail fica disponível para um novo cadastro. Propostas, pagamentos, artes e arquivos permanecem com a identidade original; um novo usuário com o mesmo e-mail não herda o histórico privado. Caso a remoção do login falhe, o perfil permanece bloqueado e a operação pode ser repetida. Excluir apenas um login de organizadora mantém seu cadastro comercial disponível.

Em **Feiras → Excluir feira**, todos os usuários vinculados, inclusive bloqueados, precisam ser reatribuídos ou excluídos primeiro. O registro fica marcado como excluído e sai dos cadastros e seletores, conservando o nome e os vínculos históricos. Projetos compartilhados continuam disponíveis à organizadora se houver outra feira válida que os utilize.

Em **Organizadoras → Excluir organizadora**, primeiro exclua as feiras e reatribua/exclua os demais usuários vinculados. Ao confirmar, os logins de organizadora restantes são removidos e seus acessos aos projetos são revogados. O cadastro histórico é conservado.

Excluir um cadastro **não cancela uma proposta nem uma ordem de produção**. Para desistências, retire a proposta pela tela de propostas, que suspende a produção e registra a pendência financeira quando necessário. Cadastros excluídos não podem ser reativados por edição de vínculos ou liberação de acesso.

Teste de integração: `scripts/qa-exclusoes-cadastros.mjs`, exclusivamente no projeto `demo-uset` dos emuladores. Verifica identidade, permissões, dependências, preservação de histórico, leitura autenticada do GLB após excluir o expositor, reutilização do e-mail e exclusão concorrente com cadastro.
