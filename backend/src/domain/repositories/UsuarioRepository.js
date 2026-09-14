class UsuarioRepository {
  async buscarPorLogin(_login) {
    throw new Error("UsuarioRepository.buscarPorLogin não implementado.");
  }

  async buscarPorId(_id) {
    throw new Error("UsuarioRepository.buscarPorId não implementado.");
  }

  async contarAdministradoresAtivos(_empresaId) {
    throw new Error("UsuarioRepository.contarAdministradoresAtivos não implementado.");
  }

  async atualizarSenha(_usuarioId, _novaSenhaHash) {
    throw new Error("UsuarioRepository.atualizarSenha não implementado.");
  }

  // RF05 — Manter Usuário (Técnico/Vendedor, exclusivo do Administrador)
  async criar(_dadosUsuario /* { nome, login, email, senhaHash, perfil, empresaId } */) {
    throw new Error("UsuarioRepository.criar não implementado.");
  }

  async listarPorEmpresa(_empresaId) {
    throw new Error("UsuarioRepository.listarPorEmpresa não implementado.");
  }

  async atualizar(_id, _dados) {
    throw new Error("UsuarioRepository.atualizar não implementado.");
  }

  async atualizarStatus(_id, _ativo) {
    throw new Error("UsuarioRepository.atualizarStatus não implementado.");
  }
}

module.exports = { UsuarioRepository };
