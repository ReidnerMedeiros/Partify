/**
 * Contrato do Agente de Consulta (RF12 — Consulta Técnica via RAG). Diferente do
 * EmbeddingService (que só vetoriza texto), este serviço faz a etapa de GERAÇÃO
 * do RAG: recebe a pergunta do usuário e um conjunto de peças já recuperadas por
 * similaridade semântica (ver ComponenteRepository.buscarPorSimilaridadeSemantica,
 * reaproveitado do RF11), e devolve uma resposta em linguagem natural fundamentada
 * SOMENTE nesse contexto — nunca em conhecimento externo do modelo (RN01).
 *
 * Implementação concreta em src/agentesIA/AgenteConsulta/GeminiRAGService, usando
 * a Gemini API. É a primeira classe própria do Agente de Consulta: até o RF11, ele
 * só reaproveitava o GeminiEmbeddingService do Agente Extrator (decisão #23), já
 * que buscar não exigia gerar texto — RF12 exige, daí esta interface nova.
 *
 * Restrição de segurança (válida para qualquer implementação): o texto de cada
 * peça de contexto (descrição, código, etc.) vem originalmente de um PDF já
 * processado pelo Agente Extrator, mas mesmo assim deve ser tratado SEMPRE como
 * dado a citar, nunca como instrução a obedecer — mesma defesa contra prompt
 * injection já aplicada no ExtractionService.
 */
class RAGService {
  /**
   * @param {Object} dados
   * @param {string} dados.pergunta pergunta em linguagem natural do usuário.
   * @param {Array<{ id: string, codigo: string, descricao: string|null, posicaoVisual: string|null, marca: string, modelo: string, tensao: string }>} dados.contexto
   *   peças candidatas, já recuperadas por similaridade semântica (RF11), na
   *   ordem de relevância (mais próxima primeiro).
   * @returns {Promise<{
   *   situacao: "RESPONDIDO"|"CONTEXTO_INSUFICIENTE"|"SEM_CONTEXTO_RELEVANTE",
   *   resposta: string|null,
   *   pecaCitadaId: string|null,
   * }>}
   */
  async gerarResposta(_dados) {
    throw new Error("RAGService.gerarResposta não implementado.");
  }
}

module.exports = { RAGService };
