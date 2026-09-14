const { GoogleGenAI } = require("@google/genai");
const { ExtractionService } = require("../../domain/services/ExtractionService");
const { INSTRUCAO_SISTEMA, montarPromptUsuario, ESQUEMA_RESPOSTA } = require("./prompts/extracaoPrompt");

function extrairTextoResposta(resposta) {
  // Pequena defesa contra variações de formato do SDK (@google/genai) entre versões —
  // tenta os formatos mais comuns antes de desistir.
  return resposta?.text ?? resposta?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function clamp0a100(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 0;
  return Math.min(100, Math.max(0, Math.round(numero)));
}

function calcularConfiancaGeral({ marcaConfianca, modeloConfianca, tensaoConfianca, pecas }) {
  const valores = [marcaConfianca, modeloConfianca, tensaoConfianca, ...pecas.map((p) => p.confianca)].filter(
    (v) => typeof v === "number" && !Number.isNaN(v)
  );
  if (valores.length === 0) return 0;
  const soma = valores.reduce((acc, v) => acc + v, 0);
  return Math.round(soma / valores.length);
}

/**
 * Loga no console do backend quantos tokens a chamada consumiu — útil pra
 * acompanhar custo, já que o RF07 usa o tier pago (Pro/Flash). `usageMetadata`
 * é o campo padrão da Gemini API para isso; se o SDK não devolver esse campo
 * (varia entre versões), a chamada simplesmente não loga nada, sem quebrar o fluxo.
 */
function logarConsumoTokens(rotulo, resposta) {
  const uso = resposta?.usageMetadata;
  if (!uso) return;
  console.log(
    `[Agente Extrator] ${rotulo} — tokens: entrada=${uso.promptTokenCount ?? "?"}, saída=${uso.candidatesTokenCount ?? "?"}, total=${uso.totalTokenCount ?? "?"}`
  ); // eslint-disable-line no-console
}

/**
 * Agente Extrator (RF07) — implementação concreta usando a Gemini API, com
 * capacidade multimodal (RNF10) para interpretar texto e elementos visuais do
 * PDF simultaneamente. Fica isolado em `agentesIA/`, junto dos demais agentes de
 * IA do sistema (ver `agentesIA/README.md`), separado da infra genérica
 * (Prisma, storage, etc.) em `src/infra/`. O modelo é configurável via
 * GEMINI_MODEL em backend/.env — os nomes de modelo da Gemini API mudam com
 * frequência, então evitamos fixar um valor no código; confirme o identificador
 * atual em https://ai.google.dev/gemini-api/docs/models antes de configurar em produção.
 */
class GeminiExtractionService extends ExtractionService {
  constructor({ apiKey, model }) {
    super();
    this.model = model;
    this.client = new GoogleGenAI({ apiKey });
  }

  async extrairDados({ arquivoBuffer, nomeArquivo, marcaSugerida, modeloSugerido }) {
    const resposta = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            { text: montarPromptUsuario({ nomeArquivo, marcaSugerida, modeloSugerido }) },
            { inlineData: { mimeType: "application/pdf", data: arquivoBuffer.toString("base64") } },
          ],
        },
      ],
      config: {
        systemInstruction: INSTRUCAO_SISTEMA,
        responseMimeType: "application/json",
        responseSchema: ESQUEMA_RESPOSTA,
      },
    });

    logarConsumoTokens(`extração de "${nomeArquivo}"`, resposta);

    const texto = extrairTextoResposta(resposta);
    if (!texto) {
      throw new Error("A Gemini API não retornou conteúdo interpretável.");
    }

    const json = JSON.parse(texto);

    const marcaConfianca = clamp0a100(json.marcaConfianca);
    const modeloConfianca = clamp0a100(json.modeloConfianca);
    const tensaoConfianca = clamp0a100(json.tensaoConfianca);
    const pecas = (json.pecas ?? []).map((peca) => ({
      codigo: peca.codigo,
      descricao: peca.descricao ?? null,
      posicaoVisual: peca.posicaoVisual ?? null,
      confianca: clamp0a100(peca.confianca),
    }));

    return {
      compreendido: Boolean(json.documentoCompreendido),
      // Guarda-corpo de domínio (RF07, fora do DERS — decisão #26 em CONTEXTO.md):
      // só é avaliado quando o documento foi de fato compreendido; um documento
      // ilegível também não é reconhecido como dentro do domínio (ver instrução
      // de sistema em extracaoPrompt.js).
      dominioReconhecido: Boolean(json.documentoCompreendido) && Boolean(json.dominioReconhecido),
      marca: json.marca ?? null,
      modelo: json.modelo ?? null,
      tensao: json.tensao ?? null,
      pecas,
      confiancaCampos: { marca: marcaConfianca, modelo: modeloConfianca, tensao: tensaoConfianca },
      confiancaGeral: calcularConfiancaGeral({ marcaConfianca, modeloConfianca, tensaoConfianca, pecas }),
    };
  }
}

module.exports = { GeminiExtractionService };
