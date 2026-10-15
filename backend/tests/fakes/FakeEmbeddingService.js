/**
 * Implementação falsa de EmbeddingService para os testes unitários do RF08.
 */
class FakeEmbeddingService {
  constructor() {
    this.deveFalhar = false;
    // Simula a cota diária da Gemini API esgotada (o serviço real sinaliza com `esgotouCota`).
    this.deveEsgotarCota = false;
    // Simula GERAR_EMBEDDINGS_NA_VALIDACAO=false (os casos de uso nem chamam o serviço).
    this.desativado = false;
    this.chamadas = [];
  }

  async gerarEmbedding(texto) {
    this.chamadas.push(texto);
    if (this.deveEsgotarCota) {
      const erro = new Error("Cota diária esgotada (simulada).");
      erro.esgotouCota = true;
      throw erro;
    }
    if (this.deveFalhar) {
      throw new Error("Falha simulada ao gerar embedding.");
    }
    return [texto.length, 0, 0];
  }
}

module.exports = { FakeEmbeddingService };
