/**
 * RF03 — Recuperar Senha / RF04 (fluxo A1 — Redefinir Senha).
 */
class TokenRedefinicaoSenhaRepository {
  async criar(_dados /* { usuarioId, tokenHash, expiraEm } */) {
    throw new Error("TokenRedefinicaoSenhaRepository.criar não implementado.");
  }

  async buscarPorHash(_tokenHash) {
    throw new Error("TokenRedefinicaoSenhaRepository.buscarPorHash não implementado.");
  }

  async marcarComoUsado(_id) {
    throw new Error("TokenRedefinicaoSenhaRepository.marcarComoUsado não implementado.");
  }
}

module.exports = { TokenRedefinicaoSenhaRepository };
