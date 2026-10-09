const { ValidationError, ServiceUnavailableError } = require("../../domain/errors/DomainErrors");

const { detectarModelos, extrairPalavrasChave, fazReferenciaAoAnterior } = require("./analisarPergunta");

const LIMITE_CONTEXTO = 8;
// Com o modelo identificado, o contexto pode levar o catálogo inteiro dele
// (permite contagem e agrupamento sem estourar o tamanho do prompt).
const LIMITE_COM_MODELO = 80;
const LIMITE_FONTES = 10;

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

  async execute({ empresaId, pergunta, modeloAnterior }) {
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

    // Recuperação em duas frentes (decisão #53): o modelo citado na pergunta
    // vira filtro do catálogo, e as palavras-chave do assunto são buscadas na
    // descrição das peças, somadas à busca semântica.
    const modelosCadastrados = (await this.componenteRepository.listarModelosValidados({ empresaId })).map(
      (item) => item.modelo
    );
    let modelos = detectarModelos(perguntaNormalizada, modelosCadastrados);

    // "Dessa ferramenta", "dele"...: sem modelo na pergunta, usa o da pergunta
    // anterior que o frontend reenviou (o backend não guarda histórico).
    if (
      modelos.length === 0 &&
      typeof modeloAnterior === "string" &&
      modelosCadastrados.includes(modeloAnterior) &&
      fazReferenciaAoAnterior(perguntaNormalizada)
    ) {
      modelos = [modeloAnterior];
    }

    const palavras = extrairPalavrasChave(perguntaNormalizada, modelos);
    const comModelo = modelos.length > 0;
    const limite = comModelo ? LIMITE_COM_MODELO : LIMITE_CONTEXTO;

    const porPalavraChave = await this.componenteRepository.buscarPorPalavrasChave({
      empresaId,
      palavras,
      modelos: comModelo ? modelos : undefined,
      limite,
    });
    const semanticos = await this.componenteRepository.buscarPorSimilaridadeSemantica({
      empresaId,
      vetor,
      modelos: comModelo ? modelos : undefined,
      limite,
    });

    let candidatos;
    let listagemCompleta = null;

    if (comModelo) {
      // Se o catálogo inteiro do modelo cabe no contexto, vai tudo: assim o agente
      // consegue contar e agrupar peças por conceito ("o que gira", "o motor"),
      // mesmo quando nenhuma descrição traz a palavra perguntada.
      const doModelo = await this.componenteRepository.listarPecasDoModelo({
        empresaId,
        modelos,
        limite: LIMITE_COM_MODELO + 1,
      });

      if (doModelo.length <= LIMITE_COM_MODELO) {
        candidatos = this.#mesclar([...porPalavraChave, ...semanticos, ...doModelo], doModelo.length);
        listagemCompleta = { modelos };
      } else {
        candidatos = this.#mesclar([...porPalavraChave, ...semanticos], LIMITE_COM_MODELO);
        // Catálogo grande demais: só garante completude para os termos buscados.
        if (palavras.length > 0 && porPalavraChave.length < limite) listagemCompleta = { modelos, palavras };
      }
    } else {
      candidatos = this.#mesclar([...porPalavraChave, ...semanticos], limite);
    }

    if (candidatos.length === 0) {
      return this.#semContexto("SEM_CONTEXTO_RELEVANTE");
    }

    let geracao;
    try {
      geracao = await this.ragService.gerarResposta({
        pergunta: perguntaNormalizada,
        contexto: candidatos,
        listagemCompleta,
      });
    } catch (erro) {
      console.error("[RF12] falha ao gerar resposta via Agente de Consulta:", erro.message); // eslint-disable-line no-console
      throw new ServiceUnavailableError(
        "Não foi possível se comunicar com o serviço de IA no momento. Tente novamente em instantes ou use a busca de componentes (RF11)."
      );
    }

    const modeloIdentificado = modelos[0];

    if (geracao.situacao !== "RESPONDIDO") {
      return this.#semContexto(geracao.situacao, modeloIdentificado);
    }

    // A resposta pode citar várias peças (ex.: "as peças que giram"). Só valem
    // ids que de fato estavam no contexto; sem nenhum válido, cai na primeira.
    const idsCitados = [geracao.pecaCitadaId, ...(geracao.pecasCitadasIds ?? [])];
    const citadas = [];
    for (const id of idsCitados) {
      const peca = candidatos.find((candidata) => candidata.id === id);
      if (peca && !citadas.includes(peca)) citadas.push(peca);
    }
    if (citadas.length === 0) citadas.push(candidatos[0]);
    const fontes = citadas.slice(0, LIMITE_FONTES).map((peca) => this.#paraFonte(peca));

    return {
      situacao: "RESPONDIDO",
      resposta: geracao.resposta,
      fonte: fontes[0],
      fontes,
      ...(modeloIdentificado ? { modeloIdentificado } : {}),
    };
  }

  #paraFonte(peca) {
    return {
      marca: peca.marca,
      modelo: peca.modelo,
      tensao: peca.tensao,
      codigo: peca.codigo,
      catalogoId: peca.catalogoId,
      validadoEm: peca.validadoEm ?? null,
    };
  }

  // Palavra-chave primeiro (casamento direto com o que foi perguntado), depois
  // semântica e o restante do catálogo; sem repetir peça e respeitando o limite.
  #mesclar(pecas, limite) {
    const vistos = new Set();
    const lista = [];
    for (const peca of pecas) {
      if (vistos.has(peca.id)) continue;
      vistos.add(peca.id);
      lista.push(peca);
    }
    return lista.slice(0, limite);
  }

  #semContexto(situacao, modeloIdentificado) {
    return { situacao, resposta: null, fonte: null, ...(modeloIdentificado ? { modeloIdentificado } : {}) };
  }
}

module.exports = { ConsultarViaRagUseCase };
