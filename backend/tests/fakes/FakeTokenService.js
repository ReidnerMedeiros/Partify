/**
 * Implementação falsa de TokenService — em vez de assinar um JWT de verdade,
 * serializa o payload em JSON. Suficiente para os Use Cases, que só chamam
 * `gerar`/`verificar` sem se importar com o formato real do token.
 */
class FakeTokenService {
  constructor() {
    this.contador = 0;
  }

  gerar(payload) {
    this.contador += 1;
    return JSON.stringify({
      ...payload,
      jti: `jti-${this.contador}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  }

  verificar(token) {
    return JSON.parse(token);
  }
}

module.exports = { FakeTokenService };
