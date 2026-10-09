/**
 * RF09 — fluxo alternativo A2 (Consulta de registros), visão por catálogo.
 * Lista os catálogos já VALIDADO da empresa autenticada (um item por documento,
 * com marca, modelo, tensão, total de peças e quem validou), em vez de uma
 * linha por peça. Filtros opcionais por marca, modelo e código de peça: com o
 * código informado, aparecem os catálogos que contêm aquela peça.
 *
 * A listagem por peça (ListarPecasUseCase) continua existindo; a busca peça a
 * peça para uso do dia a dia fica no RF11 (Consultar Componentes).
 */
class ListarCatalogosValidadosUseCase {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async execute({ empresaId, marca, modelo, codigo }) {
    return this.catalogoRepository.listarCatalogosValidados({
      empresaId,
      marca: marca?.trim() || undefined,
      modelo: modelo?.trim() || undefined,
      codigo: codigo?.trim() || undefined,
    });
  }
}

module.exports = { ListarCatalogosValidadosUseCase };
