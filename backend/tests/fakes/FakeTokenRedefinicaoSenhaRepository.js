const { randomUUID } = require("crypto");

/**
 * Implementação em memória de TokenRedefinicaoSenhaRepository para os testes
 * unitários do RF03/RF04.
 */
class FakeTokenRedefinicaoSenhaRepository {
  constructor() {
    this.tokens = [];
  }

  async criar({ usuarioId, tokenHash, expiraEm }) {
    const registro = { id: randomUUID(), usuarioId, tokenHash, expiraEm, usadoEm: null, criadoEm: new Date() };
    this.tokens.push(registro);
    return registro;
  }

  async buscarPorHash(tokenHash) {
    return this.tokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async marcarComoUsado(id) {
    const registro = this.tokens.find((t) => t.id === id);
    if (registro) registro.usadoEm = new Date();
    return registro;
  }
}

module.exports = { FakeTokenRedefinicaoSenhaRepository };
