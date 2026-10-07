# Origem da análise de artes

Os módulos em `core/` e o catálogo `perfis.js` foram copiados do projeto do usuário
https://github.com/cleitonpn/aprovacao-de-arte, commit
84a904a57871d0adabdf57fedb3cea3400fafd7c.

Reutilizamos análise local de PDF, PNG e JPEG, escala, resolução, sangria,
qualidade de imagem e geração de gabaritos PDF. O repositório de origem não foi
alterado. Autenticação, dados, permissões, fluxo de versões, chat e interface
usam a estrutura do USET Studio. A análise automática nunca autoriza impressão;
o admin confere a arte e envia uma prova específica para aprovação do expositor.
