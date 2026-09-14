const { ValidationError } = require("../../domain/errors/DomainErrors");

const MODOS = ["semantica", "codigo_exato"];

/**
 * RF11 — Consulta de Componentes (Agente de Consulta). Fluxo básico + A2
 * (busca sem filtros) + E1 (nenhum resultado) + E2 (base sem registros
 * validados).
 *
 * O DERS descreve as duas técnicas (SQL exato + vetorial/pgvector) como
 * SEMPRE executadas simultaneamente ("executa simultaneamente uma consulta
 * SQL de correspondência exata... e uma busca vetorial...") — por isso os
 * dois motores rodam em toda busca, independente do botão que o ator
 * destacou no protótipo ("Busca Semântica"/"Busca por Código Exato"). Esse
 * botão (parâmetro `modo`) afeta só a ORDENAÇÃO do resultado combinado, não
 * qual motor é acionado — decisão confirmada com o usuário antes de
 * implementar (ver CONTEXTO.md).
 *
 * O Agente de Consulta tem sua própria classe de IA para gerar o embedding do
 * termo de busca (`agentesIA/AgenteConsulta/GeminiEmbeddingService`) — uma
 * instância separada da usada pelo Agente Validador (RF08/RF09) pra vetorizar
 * as peças, mesmo sendo tecnicamente a mesma chamada de API (decisão #25 em
 * CONTEXTO.md). As duas precisam usar o mesmo modelo (`GEMINI_EMBEDDING_MODEL`),
 * senão os vetores não são comparáveis no espaço vetorial do pgvector.
 */
class BuscarComponentesUseCase {
  constructor({ componenteRepository, embeddingService }) {
    this.componenteRepository = componenteRepository;
    this.embeddingService = embeddingService;
  }

  async execute({ empresaId, termo, marca, tensao, modo }) {
    const termoNormalizado = termo?.trim();
    if (!termoNormalizado) {
      throw new ValidationError("Informe um termo de busca.", { termo: "Informe o código da peça ou uma descrição técnica." });
    }

    const modoNormalizado = MODOS.includes(modo) ? modo : "semantica";
    const marcaNormalizada = marca?.trim() || undefined;
    const tensaoNormalizada = tensao?.trim() || undefined;

    // Exceção E2 — a instância ainda não tem nenhuma peça validada (RF09):
    // não adianta nem buscar, o problema é a base estar vazia, não o termo.
    const existeAlgumRegistro = await this.componenteRepository.existeRegistroValidado({ empresaId });
    if (!existeAlgumRegistro) {
      return { semRegistrosNaBase: true, resultados: [] };
    }

    const exatos = await this.componenteRepository.buscarPorCodigoExato({
      empresaId,
      termo: termoNormalizado,
      marca: marcaNormalizada,
      tensao: tensaoNormalizada,
    });

    // A busca semântica depende da Gemini API (geração do vetor do termo) —
    // é best-effort: uma falha aqui não deve derrubar a busca por completo,
    // já que a correspondência exata (SQL puro) continua funcionando sem IA.
    let semanticos = [];
    try {
      const vetor = await this.embeddingService.gerarEmbedding(termoNormalizado);
      semanticos = await this.componenteRepository.buscarPorSimilaridadeSemantica({
        empresaId,
        vetor,
        marca: marcaNormalizada,
        tensao: tensaoNormalizada,
        limite: 20,
      });
    } catch (erro) {
      console.error("[RF11] falha ao gerar/consultar embedding da busca semântica:", erro.message); // eslint-disable-line no-console
    }

    const resultados = this.#combinar(exatos, semanticos, modoNormalizado);

    // Exceção E1 — havia registros na base, mas nenhum bateu com o termo/filtros.
    return { semRegistrosNaBase: false, resultados };
  }

  #combinar(exatos, semanticos, modo) {
    const porId = new Map();

    for (const item of exatos) {
      porId.set(item.id, { ...item, correspondenciaExata: true, distancia: null });
    }

    for (const item of semanticos) {
      const existente = porId.get(item.id);
      if (existente) {
        existente.distancia = item.distancia;
      } else {
        porId.set(item.id, { ...item, correspondenciaExata: false, distancia: item.distancia });
      }
    }

    const lista = [...porId.values()];

    if (modo === "codigo_exato") {
      lista.sort((a, b) => {
        if (a.correspondenciaExata !== b.correspondenciaExata) return a.correspondenciaExata ? -1 : 1;
        return (a.distancia ?? Infinity) - (b.distancia ?? Infinity);
      });
    } else {
      lista.sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity));
    }

    return lista;
  }
}

module.exports = { BuscarComponentesUseCase };
