/**
 * RF05 — parte de consulta do fluxo alternativo A1: lista todos os usuários
 * da instância (a tela "Usuários" do administrador), independentemente do
 * perfil ou status, para que o administrador possa ver/editar/(re)ativar
 * qualquer um deles.
 */
class ListarUsuariosUseCase {
  constructor({ usuarioRepository }) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute({ empresaId }) {
    return this.usuarioRepository.listarPorEmpresa(empresaId);
  }
}

module.exports = { ListarUsuariosUseCase };
