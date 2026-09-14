/**
 * Contrato de emissão/verificação de token de sessão (RF02). Implementação concreta
 * (JWT) em src/infra/security.
 */
class TokenService {
  gerar(_payload) {
    throw new Error("TokenService.gerar não implementado.");
  }

  verificar(_token) {
    throw new Error("TokenService.verificar não implementado.");
  }
}

module.exports = { TokenService };
