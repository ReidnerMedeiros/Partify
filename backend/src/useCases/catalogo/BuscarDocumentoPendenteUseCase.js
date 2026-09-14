const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");

/**
 * RF10 — carrega um documento IRRESOLUVEL (marca/modelo/tensão/peças já
 * identificados, quando houver, mais motivoPendencia/camposAusentes) para que
 * o ator preencha os campos ausentes (fluxo alternativo A1). O resultado tem
 * o mesmo formato usado pelo RF07/RF08 (CatalogoController#apresentarResultado),
 * de propósito: o frontend reaproveita a própria tela de validação do RF08
 * (ValidarCatalogoPage) para a edição, só trocando a origem dos dados (fetch
 * por id em vez do state de navegação recém-importado).
 */
class BuscarDocumentoPendenteUseCase {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async execute({ catalogoId, empresaId }) {
    const resultado = await this.catalogoRepository.buscarComPecas(catalogoId);

    if (!resultado || resultado.catalogo.empresaId !== empresaId || resultado.catalogo.status !== StatusCatalogo.IRRESOLUVEL) {
      throw new NotFoundError("Documento pendente não encontrado.");
    }

    return resultado;
  }
}

module.exports = { BuscarDocumentoPendenteUseCase };
