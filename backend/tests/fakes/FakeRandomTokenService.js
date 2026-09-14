/**
 * Implementação falsa de RandomTokenService — determinística, pra facilitar
 * inspecionar em teste qual token bruto corresponde a qual hash.
 */
class FakeRandomTokenService {
  constructor() {
    this.contador = 0;
  }

  gerarTokenEHash() {
    this.contador += 1;
    const tokenBruto = `token-bruto-${this.contador}`;
    return { tokenBruto, tokenHash: this.hash(tokenBruto) };
  }

  hash(tokenBruto) {
    return `hash-de-${tokenBruto}`;
  }
}

module.exports = { FakeRandomTokenService };
