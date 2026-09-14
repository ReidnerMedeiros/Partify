/**
 * Implementação em memória de SessaoRevogadaRepository para os testes unitários
 * do logout (RF02-A1).
 */
class FakeSessaoRevogadaRepository {
  constructor() {
    this.revogados = [];
  }

  async revogar(dados) {
    this.revogados.push(dados);
  }

  async estaRevogado(jti) {
    if (!jti) return true;
    return this.revogados.some((r) => r.jti === jti);
  }
}

module.exports = { FakeSessaoRevogadaRepository };
