const { EmbeddingService } = require("../../domain/services/EmbeddingService");

/**
 * Substituto do Agente Validador (embeddings) para quando
 * `GERAR_EMBEDDINGS_NA_VALIDACAO=false` no .env. Útil ao popular o banco com muitos
 * catálogos sem gastar a cota da Gemini API: a validação (RF08) e a edição (RF09)
 * salvam as peças normalmente e pulam a geração de vetores, que depois são criados
 * de uma vez com `npm run embeddings:faltantes`.
 *
 * Os casos de uso checam `desativado` e nem chamam `gerarEmbedding`; o método existe
 * só para cumprir o contrato e falhar de forma clara se alguém o chamar.
 */
class EmbeddingDesativadoService extends EmbeddingService {
  constructor() {
    super();
    this.desativado = true;
  }

  async gerarEmbedding() {
    throw new Error("Geração de embeddings desativada (GERAR_EMBEDDINGS_NA_VALIDACAO=false).");
  }
}

module.exports = { EmbeddingDesativadoService };
