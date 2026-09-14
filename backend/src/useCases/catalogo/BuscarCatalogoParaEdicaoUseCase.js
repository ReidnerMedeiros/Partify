const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");

/**
 * RF09 — carrega um catálogo já VALIDADO (marca/modelo/tensão/peças) para a
 * tela de edição (fluxo alternativo A3). Catálogos ainda pendentes/
 * irresolúveis não fazem parte do escopo do RF09 por enquanto (o ator ainda
 * não tem uma tela para retomá-los — isso fica para o futuro RF10); por isso
 * tratamos como "não encontrado" também quando o status não é VALIDADO.
 */
class BuscarCatalogoParaEdicaoUseCase {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async execute({ catalogoId, empresaId }) {
    const resultado = await this.catalogoRepository.buscarComPecas(catalogoId);

    if (!resultado || resultado.catalogo.empresaId !== empresaId || resultado.catalogo.status !== StatusCatalogo.VALIDADO) {
      throw new NotFoundError("Catálogo não encontrado.");
    }

    return resultado;
  }
}

module.exports = { BuscarCatalogoParaEdicaoUseCase };
