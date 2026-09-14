const { NotFoundError, ValidationError } = require("../../domain/errors/DomainErrors");
const { EnumTensao } = require("../../domain/enums/EnumTensao");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF08 — fluxo básico ("Validar e Salvar") + A1 (edição, já refletida nos valores
 * recebidos) + E1 (campos obrigatórios vazios). A2 (cancelar) não tem um endpoint
 * correspondente: como nada é persistido antes deste use case ser chamado (o
 * resultado do RF07 fica só na resposta HTTP, devolvida ao frontend), cancelar é
 * simplesmente não chamar este endpoint — não há nada para "desfazer" no banco.
 * E2 (falha ao persistir) é tratada genericamente pelo errorHandler (RNF05).
 *
 * É este Use Case que aciona o Agente Validador (`embeddingService`, implementado
 * por `agentesIA/AgenteValidador/GeminiEmbeddingService`): só DEPOIS que o humano
 * confirma os dados (`#gerarEmbeddings`, chamado após a persistência) é que os
 * embeddings são gerados — nunca antes, pra não vetorizar uma descrição que a IA
 * errou e que o validador ainda vai corrigir (decisão #16 em CONTEXTO.md).
 */
class ValidarCatalogoUseCase {
  constructor({ catalogoRepository, validacaoRepository, embeddingService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.validacaoRepository = validacaoRepository;
    this.embeddingService = embeddingService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, usuarioId, empresaId, marca, modelo, tensao, pecas, observacoes }) {
    const atual = await this.catalogoRepository.buscarComPecas(catalogoId);
    // RNF11 — mesma checagem de posse multi-tenant do RF06/RF07.
    if (!atual || atual.catalogo.empresaId !== empresaId) {
      throw new NotFoundError("Catálogo não encontrado.");
    }

    this.#validar({ marca, modelo, tensao, pecas });

    const resultado = await this.catalogoRepository.registrarValidacao(catalogoId, empresaId, {
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

    await this.validacaoRepository.registrar({ empresaId, catalogoId, usuarioId, observacoes: observacoes ?? null });

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.VALIDACAO_HITL,
      registroAfetado: catalogoId,
      detalhes: { marca: resultado.marca, modelo: resultado.modelo, tensao: resultado.tensao, totalPecas: resultado.pecas.length },
    });

    // RNF04 — prepara a base de busca semântica do futuro RF12. É best-effort:
    // uma falha aqui não deve desfazer a validação já persistida com sucesso.
    await this.#gerarEmbeddings(resultado.pecas);

    return resultado;
  }

  async #gerarEmbeddings(pecas) {
    for (const peca of pecas) {
      try {
        const texto = [peca.codigo, peca.descricao].filter(Boolean).join(" — ");
        const vetor = await this.embeddingService.gerarEmbedding(texto);
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
        // RN04 — Indissociabilidade entre Código e Diagrama: um código de
        // peça sem sua posição visual no diagrama é considerado informação
        // tecnicamente incompleta, insuficiente para garantir compatibilidade.
        if (!peca.posicaoVisual?.trim()) {
          fieldErrors[`pecas.${indice}.posicaoVisual`] = "Informe a posição visual da peça no diagrama.";
        }
      });
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível salvar a validação. Revise os campos destacados.", fieldErrors);
    }
  }
}

module.exports = { ValidarCatalogoUseCase };
