const { GoogleGenAI } = require("@google/genai");
const { EmbeddingService } = require("../../domain/services/EmbeddingService");

const DIMENSOES = 768; // precisa bater com Peca.embedding (vector(768)) no schema.prisma

/**
 * Agente de Consulta (RF11/RF12) — geração de embeddings vetoriais para o
 * TERMO DE BUSCA (RF11) ou a PERGUNTA (RF12) do ator, a serem comparados via
 * pgvector contra os embeddings das peças já vetorizadas pelo Agente Validador
 * (`agentesIA/AgenteValidador/GeminiEmbeddingService.js`). É uma instância
 * própria e separada da do Agente Validador — mesmo sendo tecnicamente a
 * mesma chamada de API (`embedContent`), cada agente do DERS (Extrator,
 * Validador, Consulta) ganhou sua própria classe, para não concentrar todas
 * as responsabilidades de IA no Agente Extrator (decisão #25 em CONTEXTO.md).
 *
 * Importante: para os vetores serem comparáveis no espaço do pgvector, esta
 * classe precisa ser configurada com o MESMO `GEMINI_EMBEDDING_MODEL` usado
 * pelo Agente Validador — são instâncias diferentes, mas do mesmo modelo.
 *
 * O Agente de Consulta também é responsável pela geração de resposta em
 * linguagem natural do RF12 (ver `agentesIA/AgenteConsulta/GeminiRAGService.js`)
 * — as duas capacidades (embedding e geração) ficam na mesma pasta, já que
 * ambas pertencem ao mesmo agente conceitual, cada uma em sua própria classe.
 */
class GeminiEmbeddingService extends EmbeddingService {
  constructor({ apiKey, model }) {
    super();
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async gerarEmbedding(texto) {
    const resposta = await this.client.models.embedContent({
      model: this.model,
      contents: texto,
      config: { outputDimensionality: DIMENSOES },
    });

    // Nem toda versão do SDK devolve usageMetadata para embeddings (menos padronizado
    // que generateContent) — loga só quando disponível, sem quebrar o fluxo se faltar.
    const uso = resposta?.usageMetadata;
    if (uso) {
      console.log(
        `[Agente de Consulta] embedding de "${texto.slice(0, 40)}${texto.length > 40 ? "..." : ""}" — tokens: total=${uso.totalTokenCount ?? "?"}`
      ); // eslint-disable-line no-console
    }

    const vetor = resposta?.embeddings?.[0]?.values ?? resposta?.embedding?.values;
    if (!vetor) {
      throw new Error("A Gemini API não retornou um vetor de embedding.");
    }
    return vetor;
  }
}

module.exports = { GeminiEmbeddingService };
