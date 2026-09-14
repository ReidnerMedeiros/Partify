const { GoogleGenAI } = require("@google/genai");
const { EmbeddingService } = require("../../domain/services/EmbeddingService");

const DIMENSOES = 768; // precisa bater com Peca.embedding (vector(768)) no schema.prisma

/**
 * Agente Validador (RF08) — geração de embeddings vetoriais. Diferente do
 * Agente Extrator (que só lê o PDF e devolve dados brutos + confiança, sem
 * tocar em embeddings) e do Agente de Consulta (que tem sua própria instância
 * desta mesma capacidade, em `agentesIA/AgenteConsulta/GeminiEmbeddingService.js`,
 * pra vetorizar termos de busca/perguntas), esta classe é acionada só DEPOIS
 * que o validador humano confirma os dados (`ValidarCatalogoUseCase`/RF08 e
 * `AtualizarCatalogoUseCase`/RF09) — nunca antes, pra não vetorizar uma
 * descrição que a IA errou e que o humano ainda vai corrigir (ver decisão #16
 * em CONTEXTO.md). É best-effort: uma falha na geração não impede a validação
 * de ser persistida.
 *
 * Separação explícita a pedido do usuário: o DERS descreve 3 agentes
 * (Extrator, Validador, Consulta) com responsabilidades próprias — cada um
 * ganhou sua própria classe/pasta em `agentesIA/`, mesmo quando duas delas
 * fazem tecnicamente a mesma chamada de API (`embedContent`), pra manter a
 * divisão de responsabilidades clara em vez de concentrar tudo no Agente
 * Extrator (ver decisão #25 em CONTEXTO.md).
 *
 * Gera vetores de 768 posições (mesma dimensão já modelada em
 * `Peca.embedding`), preparando a base para a busca semântica do RF11/RF12
 * (Agente de Consulta).
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
        `[Agente Validador] embedding de "${texto.slice(0, 40)}${texto.length > 40 ? "..." : ""}" — tokens: total=${uso.totalTokenCount ?? "?"}`
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
