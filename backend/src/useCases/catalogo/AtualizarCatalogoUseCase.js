const { NotFoundError, ValidationError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");
const { EnumTensao } = require("../../domain/enums/EnumTensao");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF09 — fluxo alternativo A3 (Atualização de registro). Edita marca/modelo/
 * tensão e a lista de peças de um catálogo já VALIDADO: peças com id são
 * atualizadas, peças sem id são criadas, e peças que existiam antes mas não
 * vieram mais na lista foram removidas pelo ator na tela de edição (o
 * repositório cuida da exclusão por diferença — ver PrismaCatalogoRepository).
 *
 * RN04 — código e posição visual são um binômio obrigatório: reaplicamos essa
 * validação aqui (o RF08/ValidarCatalogoUseCase também foi corrigido para
 * exigir os dois).
 *
 * Assim como o RF08, aciona o Agente Validador (`embeddingService`, implementado
 * por `agentesIA/AgenteValidador/GeminiEmbeddingService`) só para peças novas ou
 * alteradas, depois que a edição já foi persistida.
 */
class AtualizarCatalogoUseCase {
  constructor({ catalogoRepository, embeddingService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.embeddingService = embeddingService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, empresaId, usuarioId, marca, modelo, tensao, pecas }) {
    const atual = await this.catalogoRepository.buscarComPecas(catalogoId);
    if (!atual || atual.catalogo.empresaId !== empresaId || atual.catalogo.status !== StatusCatalogo.VALIDADO) {
      throw new NotFoundError("Catálogo não encontrado.");
    }

    this.#validar({ marca, modelo, tensao, pecas });

    // Captura o texto "antes" de cada peça (código + descrição) já aqui, antes
    // de chamar o repositório — mesmo motivo documentado em
    // AtualizarEmpresaUseCase/AtualizarUsuarioUseCase: não depender do
    // repositório devolver sempre uma instância nova.
    const textoAnteriorPorId = new Map(
      atual.pecas.map((peca) => [peca.id, [peca.codigo, peca.descricao].filter(Boolean).join(" — ")])
    );
    const anterior = { marca: atual.marca, modelo: atual.modelo, tensao: atual.tensao, totalPecas: atual.pecas.length };

    const resultado = await this.catalogoRepository.atualizarCatalogo(catalogoId, empresaId, {
      marca: marca.trim(),
      modelo: modelo.trim(),
      tensao,
      pecas: pecas.map((peca) => ({
        id: peca.id ?? null,
        codigo: peca.codigo.trim(),
        descricao: peca.descricao?.trim() || null,
        posicaoVisual: peca.posicaoVisual.trim(),
      })),
    });

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.EDICAO_REGISTRO,
      registroAfetado: catalogoId,
      detalhes: {
        anterior,
        novo: { marca: resultado.marca, modelo: resultado.modelo, tensao: resultado.tensao, totalPecas: resultado.pecas.length },
      },
    });

    // Best-effort (mesmo padrão do RF08): só reprocessa o embedding de peças
    // novas ou cujo texto realmente mudou, evitando chamadas desnecessárias à
    // Gemini API em peças que o ator não tocou nesta edição.
    await this.#atualizarEmbeddings(resultado.pecas, textoAnteriorPorId);

    return resultado;
  }

  async #atualizarEmbeddings(pecas, textoAnteriorPorId) {
    for (const peca of pecas) {
      const textoNovo = [peca.codigo, peca.descricao].filter(Boolean).join(" — ");
      if (textoAnteriorPorId.get(peca.id) === textoNovo) continue;

      try {
        const vetor = await this.embeddingService.gerarEmbedding(textoNovo);
        await this.catalogoRepository.atualizarEmbeddingPeca(peca.id, vetor);
      } catch (erro) {
        console.error(`[embedding-falhou] peça ${peca.id}:`, erro.message); // eslint-disable-line no-console
      }
    }
  }

  #validar({ marca, modelo, tensao, pecas }) {
    const fieldErrors = {};

    if (!marca?.trim()) fieldErrors.marca = "Informe a marca.";
    if (!modelo?.trim()) fieldErrors.modelo = "Informe o modelo.";
    if (!tensao || !Object.values(EnumTensao).includes(tensao)) fieldErrors.tensao = "Selecione a tensão.";

    if (!pecas || pecas.length === 0) {
      fieldErrors.pecas = "Adicione ao menos uma peça.";
    } else {
      pecas.forEach((peca, indice) => {
        if (!peca.codigo?.trim()) {
          fieldErrors[`pecas.${indice}.codigo`] = "Informe o código da peça.";
        }
        if (!peca.posicaoVisual?.trim()) {
          fieldErrors[`pecas.${indice}.posicaoVisual`] = "Informe a posição visual da peça no diagrama.";
        }
      });
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível salvar as alterações. Revise os campos destacados.", fieldErrors);
    }
  }
}

module.exports = { AtualizarCatalogoUseCase };
