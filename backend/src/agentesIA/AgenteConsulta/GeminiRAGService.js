const { GoogleGenAI } = require("@google/genai");
const { RAGService } = require("../../domain/services/RAGService");
const { INSTRUCAO_SISTEMA, montarPromptUsuario, ESQUEMA_RESPOSTA } = require("./prompts/consultaPrompt");

const SITUACOES_VALIDAS = ["RESPONDIDO", "CONTEXTO_INSUFICIENTE", "SEM_CONTEXTO_RELEVANTE"];

function extrairTextoResposta(resposta) {
  // Mesma pequena defesa contra variações de formato do SDK usada no
  // GeminiExtractionService (RF07).
  return resposta?.text ?? resposta?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function logarConsumoTokens(resposta) {
  const uso = resposta?.usageMetadata;
  if (!uso) return;
  console.log(
    `[Agente de Consulta] RF12 — tokens: entrada=${uso.promptTokenCount ?? "?"}, saída=${uso.candidatesTokenCount ?? "?"}, total=${uso.totalTokenCount ?? "?"}`
  ); // eslint-disable-line no-console
}

/**
 * Agente de Consulta (RF12) — implementação concreta usando a Gemini API,
 * responsável pela GERAÇÃO da resposta (ver comentário em
 * domain/services/RAGService.js e decisão #24 em CONTEXTO.md). É a segunda
 * capacidade própria do Agente de Consulta — a primeira é a vetorização de
 * termo/pergunta, em `agentesIA/AgenteConsulta/GeminiEmbeddingService.js`
 * (usada tanto pelo RF11 quanto pelo RF12, decisão #25 em CONTEXTO.md). Fica
 * isolada em agentesIA/, junto dos demais agentes de IA do sistema, separada
 * da infra genérica (Prisma, storage) em src/infra/.
 */
class GeminiRAGService extends RAGService {
  constructor({ apiKey, model }) {
    super();
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async gerarResposta({ pergunta, contexto }) {
    const resposta = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [{ text: montarPromptUsuario({ pergunta, contexto }) }],
        },
      ],
      config: {
        systemInstruction: INSTRUCAO_SISTEMA,
        responseMimeType: "application/json",
        responseSchema: ESQUEMA_RESPOSTA,
      },
    });

    logarConsumoTokens(resposta);

    const texto = extrairTextoResposta(resposta);
    if (!texto) {
      throw new Error("A Gemini API não retornou conteúdo interpretável.");
    }

    const json = JSON.parse(texto);
    const situacao = SITUACOES_VALIDAS.includes(json.situacao) ? json.situacao : "SEM_CONTEXTO_RELEVANTE";

    // Nunca confia cegamente no pecaCitadaId devolvido pelo modelo: só é aceito
    // se corresponder a um dos ids que de fato fizeram parte do contexto enviado
    // nesta requisição — evita citar uma peça "inventada" mesmo em caso de
    // alucinação pontual do modelo.
    const idsValidos = new Set(contexto.map((peca) => peca.id));
    const pecaCitadaId = situacao === "RESPONDIDO" && idsValidos.has(json.pecaCitadaId) ? json.pecaCitadaId : null;

    return {
      situacao,
      resposta: situacao === "RESPONDIDO" ? json.resposta ?? null : null,
      pecaCitadaId,
    };
  }
}

module.exports = { GeminiRAGService };
