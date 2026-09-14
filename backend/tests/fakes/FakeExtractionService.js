/**
 * Implementação falsa do Agente Extrator (ExtractionService) para os testes
 * unitários do RF07. A resposta é controlada pelo teste via `proximaResposta`;
 * `deveFalhar` simula a exceção E1 (falha de comunicação com a Gemini API).
 */
class FakeExtractionService {
  constructor() {
    this.proximaResposta = null;
    this.deveFalhar = false;
    this.chamadas = [];
  }

  async extrairDados(dados) {
    this.chamadas.push(dados);
    if (this.deveFalhar) {
      throw new Error("Falha simulada de comunicação com a Gemini API.");
    }
    return this.proximaResposta;
  }
}

module.exports = { FakeExtractionService };
