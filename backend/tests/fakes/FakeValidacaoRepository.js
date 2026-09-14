/**
 * Implementação em memória de ValidacaoRepository para os testes unitários do RF08.
 */
class FakeValidacaoRepository {
  constructor() {
    this.registros = [];
  }

  async registrar(dados) {
    this.registros.push(dados);
    return dados;
  }
}

module.exports = { FakeValidacaoRepository };
