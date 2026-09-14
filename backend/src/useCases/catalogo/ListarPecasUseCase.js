/**
 * RF09 — fluxo alternativo A2 (Consulta de registros). Lista as peças de
 * catálogos já VALIDADO da empresa autenticada, com filtros opcionais por
 * marca, modelo e código da peça (campos do protótipo da tela "Manter
 * Catálogo" — o texto do DERS cita "tensão" em vez de "código da peça" como
 * filtro; seguimos o protótipo, mais concreto, e registramos a divergência no
 * CONTEXTO.md).
 */
class ListarPecasUseCase {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async execute({ empresaId, marca, modelo, codigo }) {
    return this.catalogoRepository.listarPecasValidadas({
      empresaId,
      marca: marca?.trim() || undefined,
      modelo: modelo?.trim() || undefined,
      codigo: codigo?.trim() || undefined,
    });
  }
}

module.exports = { ListarPecasUseCase };
