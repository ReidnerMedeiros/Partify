/**
 * Contrato de geração de embeddings vetoriais, usados para a busca semântica
 * via pgvector (RF11/RF12). Tem DUAS implementações concretas, uma por agente
 * (decisão #25 em CONTEXTO.md — o DERS descreve 3 agentes com responsabilidades
 * próprias, então cada um ganhou sua própria classe, mesmo fazendo tecnicamente
 * a mesma chamada de API):
 * - `agentesIA/AgenteValidador/GeminiEmbeddingService` — vetoriza peças
 *   validadas (RF08/RF09), só depois da confirmação humana.
 * - `agentesIA/AgenteConsulta/GeminiEmbeddingService` — vetoriza o termo de
 *   busca (RF11) ou a pergunta (RF12) do ator.
 * As duas instâncias precisam usar o mesmo modelo (`GEMINI_EMBEDDING_MODEL`)
 * pra os vetores serem comparáveis no mesmo espaço do pgvector.
 */
class EmbeddingService {
  /**
   * @param {string} _texto texto-base da peça (código + descrição), tratado
   *   sempre como dado a ser vetorizado, nunca como instrução.
   * @returns {Promise<number[]>} vetor de 768 posições.
   */
  async gerarEmbedding(_texto) {
    throw new Error("EmbeddingService.gerarEmbedding não implementado.");
  }
}

module.exports = { EmbeddingService };
