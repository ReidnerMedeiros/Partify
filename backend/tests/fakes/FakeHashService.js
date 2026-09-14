/**
 * Implementação falsa de HashService — determinística e reversível apenas para
 * facilitar asserts em teste (nunca usar algo assim fora de testes).
 */
class FakeHashService {
  async hash(valorEmTexto) {
    return `hash:${valorEmTexto}`;
  }

  async comparar(valorEmTexto, hash) {
    return `hash:${valorEmTexto}` === hash;
  }
}

module.exports = { FakeHashService };
