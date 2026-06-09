## Mudanças Necessárias No Backend

1. Criar middleware authorizeRoles(...roles) usando req.usuario.perfil, e aplicar em rotas de usuários, parceiros, validação, exportação, dashboard e terras.
2. Remover SEED_USER_ID dos controllers HTML e usar sempre req.usuario.id.
3. Alinhar perfis: decidir oficialmente entre administrador/editor/observador ou administrador/analista/coordenador e corrigir WAD, seed, badges e autorização.
4. Alterar autenticação para negar login de usuário inativo.
5. Ao inativar usuário, encerrar todas as sessões ativas daquele usuário. Adicionar método em AuthSessionRepository, por exemplo encerrarSessoesDoUsuario(usuarioId, revogadaPor).
6. Criar fluxo de primeiro acesso/cadastro de senha, porque usuários são criados com senha_hash = NULL.
7. Separar salvar rascunho de enviar para validação. Rascunho deve aceitar campos incompletos; envio/ativação deve validar obrigatórios.
8. Expandir modelo de parceiro/vínculo: persistir telefone, região, inscrição estadual, usina/unidade, observações, tipo comercial (fornecedor/arrendador), área plantada, TCH, ATR ou mover esses dados para tabelas específicas.
9. Criar schemas Zod completos para createParceiro, updateParceiro, sendToValidation, interação e exportação.
10. Registrar registro_alteracao em criação, edição, exclusão lógica, vínculos com terras e alterações de usuário.
11. Implementar exclusão lógica de parceiro e terra como ação própria, não só edição manual de status.
12. Criar repository/service para listar interações por parceiro em ordem decrescente.
13. Melhorar exportação para trazer nome, contato, tipo de parceiro, região, telefone principal, email e terra/unidade quando existir.
14. Criar backend de rascunhos/devolvidos do analista logado e comentário mais recente de devolução.
15. Criar notificação interna para devolução/aprovação e, se RF025 for obrigatório, tabela notificacoes + job periódico.
16. Criar upload de arquivos se RF024 entrar no escopo final: tabela arquivos, middleware de upload, vínculo com parceiro/relatório.
17. Corrigir fila de validação para consulta SQL WHERE status='pendente', ordenada por envio.
18. Criar endpoints HTML/API para terras: cadastro, edição, listagem e vínculo com parceiros.


19. Adicionar testes para autorização por perfil, sessão revogada por inativação, rascunho incompleto, envio com validação completa, histórico de edição e integração das views.


## Mudanças Necessárias No Frontend

20. Diferenciar “Salvar Rascunho” e “Enviar para Validação” com name="acao" ou rotas separadas.
21. Atualizar formulário de parceiro para persistir todos os campos exibidos ou remover campos que não serão salvos.
22. Criar variações claras de cadastro: fornecedor de cana e proprietário/arrendador, com campos próprios.
23. Popular edição com os dados atuais do parceiro, não formulário vazio em modo PATCH.
24. No perfil do parceiro, exibir dados cadastrais completos, contatos, terras vinculadas, vínculos comerciais, histórico de interações e histórico de alterações.
25. Transformar modal de interação em formulário real com POST /parceiros/:id/interacoes, tipo, data e descrição.
26. Criar tela “Meus rascunhos/devolvidos” para analistas, com comentário de devolução.
27. Criar tela ou seção de terras: listar, cadastrar, editar e vincular/desvincular parceiro.
28. Criar dashboard visual para métricas de interações e base de parceiros.
29. Esconder/mostrar navegação por perfil: usuários só para administrador; validação para coordenador/administrador; edição/cadastro para analista/administrador; exportação conforme regra definida.
30. Adicionar feedback visual após salvar, enviar, aprovar, devolver, registrar interação e exportar.
31. Ajustar exportação para explicar exatamente os campos reais do CSV.
32. Adicionar painel de notificações se aprovação/devolução/RF025 forem mantidos.

33. Revisar responsividade das tabelas e cards de detalhe para mobile, porque o WAD cobra usabilidade desktop/mobile.


## Ordem Recomendada

Alinhar oficialmente os perfis

Decidir e padronizar administrador, analista, coordenador no WAD, seed, backend, badges e autorização.

Criar middleware authorizeRoles(...roles)

Usar req.usuario.perfil vindo do requireAuth.

Aplicar autorização nas rotas protegidas

Usuários, parceiros, validação, exportação, dashboard e terras.

Alterar autenticação para negar login de usuário inativo

Remover SEED_USER_ID dos controllers HTML

Usar sempre req.usuario.id.

Adicionar método para encerrar sessões de um usuário

Exemplo: AuthSessionRepository.encerrarSessoesDoUsuario(usuarioId, revogadaPor).

Atualizar inativação de usuário

Ao inativar, marcar ativo=false e revogar sessões ativas.

Criar fluxo de primeiro acesso/cadastro de senha

Necessário porque usuários são criados com senha_hash = NULL.

Criar schemas Zod completos

Começar por createParceiro, updateParceiro, sendToValidation, interação e exportação.

Expandir modelo de parceiro/vínculo

Persistir telefone, região, inscrição estadual, usina/unidade, observações, tipo comercial, área plantada, TCH e ATR.

Atualizar migrations/models/repositories para os novos campos

Atualizar formulário de parceiro para persistir todos os campos exibidos

Criar variações claras de cadastro

Fornecedor de cana e proprietário/arrendador, com campos próprios.

Diferenciar “Salvar Rascunho” e “Enviar para Validação”
Usar name="acao" ou rotas separadas.

Separar regra de rascunho e envio para validação
Rascunho aceita incompleto; envio exige campos obrigatórios.

Registrar registro_alteracao na criação de parceiro

Registrar registro_alteracao na edição de parceiro

Preservar dados anteriores e novos.

Implementar exclusão lógica de parceiro e terra como ação própria

Registrar registro_alteracao em exclusão lógica

Registrar registro_alteracao em vínculos parceiro-terra

Registrar registro_alteracao em alterações de usuário

Corrigir fila de validação

Buscar direto no SQL com WHERE status = 'pendente', ordenada por data de envio.

Criar backend de rascunhos/devolvidos do analista logado
Incluir comentário mais recente de devolução.

Criar tela “Meus rascunhos/devolvidos”

Popular edição com dados atuais do parceiro

Não abrir formulário vazio em modo PATCH.

Criar repository/service para listar interações por parceiro
Ordem decrescente por data/criação.

Transformar modal de interação em formulário real
POST /parceiros/:id/interacoes, com tipo, data e descrição.

Atualizar perfil do parceiro
Exibir dados completos, contatos, terras, vínculos, interações e histórico de alterações.

Criar endpoints HTML/API para terras
Cadastro, edição, listagem e vínculo com parceiros.

Criar tela ou seção de terras
Listar, cadastrar, editar e vincular/desvincular parceiro.

Melhorar exportação
Trazer nome, contato, tipo de parceiro, região, telefone principal, email e terra/unidade.

Atualizar frontend da exportação
Explicar exatamente os campos reais do CSV e adicionar feedback visual.

Criar dashboard visual
Métricas de interações e base de parceiros.