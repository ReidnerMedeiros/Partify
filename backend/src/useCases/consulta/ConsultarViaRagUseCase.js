const { ValidationError, ServiceUnavailableError } = require("../../domain/errors/DomainErrors");

const LIMITE_CONTEXTO = 8;

/**
 * RF12 — Consulta Técnica via RAG (Agente de Consulta). Fluxo: 1) valida a
 * pergunta; 2) checa se existe ao menos um registro validado na empresa
 * (pré-condição 4.2 — mesma otimização de custo do RF11, evita chamar a Gemini
 * API à toa); 3) gera o embedding da pergunta (via `embeddingService`,
 * implementado por `agentesIA/AgenteConsulta/GeminiEmbeddingService` — a
 * instância própria do Agente de Consulta, separada da do Agente Validador,
 * ver decisão #25 em CONTEXTO.md) e recupera até LIMITE_CONTEXTO peças
 * candidatas por similaridade semântica (reaproveita
 * ComponenteRepository.buscarPorSimilaridadeSemantica do RF11); 4) envia a
 * pergunta + contexto pro Agente de Consulta (`ragService`, implementado por
 * `agentesIA/AgenteConsulta/GeminiRAGService`) gerar a resposta fundamentada
 * (RN01).
 *
 * Decisão de design (documentada como decisão #24 em CONTEXTO.md) sobre como
 * distinguir as exceções E1 (contexto insuficiente) e E3 (pergunta sem
 * contexto identificável), já que o DERS não define um critério numérico:
 *   - Nenhum registro validado na empresa → mapeado para E1
 *     (CONTEXTO_INSUFICIENTE), pois a ação sugerida do E1 ("importe um
 *     catálogo") é exatamente o que resolve esse caso.
 *   - Perguntas com pelo menos um registro validado na base → a classificação
 *     entre RESPONDIDO / CONTEXTO_INSUFICIENTE / SEM_CONTEXTO_RELEVANTE é
 *     delegada ao próprio Agente de Consulta (Gemini), que é quem tem
 *     condições reais de avaliar se o contexto recuperado responde à pergunta
 *     específica feita — um corte por distância vetorial fixa seria frágil
 *     demais pra essa nuance.
 *   - Nenhuma peça candidata recuperada apesar de existir base validada (caso
 *     defensivo, não deveria ocorrer em uso normal) → mapeado para E3
 *     (SEM_CONTEXTO_RELEVANTE), por segurança.
 */
class ConsultarViaRagUseCase {
  constructor({ componenteRepository, embeddingService, ragService }) {
    this.componenteRepository = componenteRepository;
    this.embeddingService = embeddingService;
    this.ragService = ragService;
  }

  async execute({ empresaId, pergunta }) {
    const perguntaNormalizada = pergunta?.trim();
    if (!perguntaNormalizada) {
      throw new ValidationError("Informe uma pergunta técnica.", { pergunta: "Digite sua pergunta técnica." });
    }

    const existeAlgumRegistro = await this.componenteRepository.existeRegistroValidado({ empresaId });
    if (!existeAlgumRegistro) {
      return this.#semContexto("CONTEXTO_INSUFICIENTE");
    }

    let vetor;
    try {
      vetor = await this.embeddingService.gerarEmbedding(perguntaNormalizada);
    } catch (erro) {
      console.error("[RF12] falha ao gerar embedding da pergunta:", erro.message); // eslint-disable-line no-console
      throw new ServiceUnavailableError(
        "Não foi possível se comunicar com o serviço de IA no momento. Tente novamente em instantes ou use a busca de componentes (RF11)."
      );
    }

    const candidatos = await this.componenteRepository.buscarPorSimilaridadeSemantica({
      empresaId,
      vetor,
      limite: LIMITE_CONTEXTO,
    });

    if (candidatos.length === 0) {
      return this.#semContexto("SEM_CONTEXTO_RELEVANTE");
    }

    let geracao;
    try {
      geracao = await this.ragService.gerarResposta({ pergunta: perguntaNormalizada, contexto: candidatos });
    } catch (erro) {
      console.error("[RF12] falha ao gerar resposta via Agente de Consulta:", erro.message); // eslint-disable-line no-console
      throw new ServiceUnavailableError(
        "Não foi possível se comunicar com o serviço de IA no momento. Tente novamente em instantes ou use a busca de componentes (RF11)."
      );
    }

    if (geracao.situacao !== "RESPONDIDO") {
      return this.#semContexto(geracao.situacao);
    }

    const pecaCitada = candidatos.find((peca) => peca.id === geracao.pecaCitadaId) ?? candidatos[0];

    return {
      situacao: "RESPONDIDO",
      resposta: geracao.resposta,
      fonte: {
        marca: pecaCitada.marca,
        modelo: pecaCitada.modelo,
        tensao: pecaCitada.tensao,
        codigo: pecaCitada.codigo,
        catalogoId: pecaCitada.catalogoId,
        validadoEm: pecaCitada.validadoEm ?? null,
      },
    };
  }

  #semContexto(situacao) {
    return { situacao, resposta: null, fonte: null };
  }
}

module.exports = { ConsultarViaRagUseCase };
