/**
 * RF02 (Logout) / RNF07 — denylist de tokens de sessão revogados.
 */
class SessaoRevogadaRepository {
  async revogar(_dados /* { jti, usuarioId, expiraEm } */) {
    throw new Error("SessaoRevogadaRepository.revogar não implementado.");
  }

  async estaRevogado(_jti) {
    throw new Error("SessaoRevogadaRepository.estaRevogado não implementado.");
  }
}

module.exports = { SessaoRevogadaRepository };
