/**
 * Implementação falsa de EmbeddingService para os testes unitários do RF08.
 */
class FakeEmbeddingService {
  constructor() {
    this.deveFalhar = false;
    this.chamadas = [];
  }

  async gerarEmbedding(texto) {
    this.chamadas.push(texto);
    if (this.deveFalhar) {
      throw new Error("Falha simulada ao gerar embedding.");
    }
    return [texto.length, 0, 0];
  }
}

module.exports = { FakeEmbeddingService };
