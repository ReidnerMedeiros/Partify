/**
 * Implementação falsa de RAGService para os testes unitários do RF12. Por
 * padrão simula "RESPONDIDO" citando a primeira peça do contexto recebido —
 * cada teste pode sobrescrever `proximaResposta` ou `deveFalhar` para simular
 * os outros cenários (E1/E3/E2).
 */
class FakeRAGService {
  constructor() {
    this.deveFalhar = false;
    this.proximaResposta = null;
    this.chamadas = [];
  }

  async gerarResposta({ pergunta, contexto }) {
    this.chamadas.push({ pergunta, contexto });
    if (this.deveFalhar) {
      throw new Error("Falha simulada ao gerar resposta via Agente de Consulta.");
    }
    if (this.proximaResposta) {
      return this.proximaResposta;
    }
    return {
      situacao: "RESPONDIDO",
      resposta: `Resposta simulada para: ${pergunta}`,
      pecaCitadaId: contexto[0]?.id ?? null,
    };
  }
}

module.exports = { FakeRAGService };
