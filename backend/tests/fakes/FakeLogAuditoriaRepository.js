/**
 * Implementação em memória de LogAuditoriaRepository para os testes unitários.
 * Permite inspecionar, nos asserts, exatamente o que cada Use Case registrou.
 */
class FakeLogAuditoriaRepository {
  constructor() {
    this.registros = [];
    this.proximoId = 1;
  }

  async registrar(log) {
    const registro = {
      id: `log-${this.proximoId++}`,
      realizadoEm: new Date(),
      ...log,
    };
    this.registros.push(registro);
    return registro;
  }

  async consultar({ empresaId, usuarioId, tipoAcao, dataInicial, dataFinal }) {
    return this.registros
      .filter((registro) => registro.empresaId === empresaId)
      .filter((registro) => !usuarioId || registro.usuarioId === usuarioId)
      .filter((registro) => !tipoAcao || registro.tipoAcao === tipoAcao)
      .filter((registro) => !dataInicial || registro.realizadoEm >= dataInicial)
      .filter((registro) => !dataFinal || registro.realizadoEm <= dataFinal)
      .sort((a, b) => a.realizadoEm - b.realizadoEm);
  }
}

module.exports = { FakeLogAuditoriaRepository };
