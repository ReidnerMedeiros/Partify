const { NotFoundError } = require("../../domain/errors/DomainErrors");

/**
 * RF01 — fluxo alternativo A1 (parte de consulta): retorna os dados cadastrados
 * da empresa/instância do administrador autenticado.
 */
class ConsultarEmpresaUseCase {
  constructor({ empresaRepository }) {
    this.empresaRepository = empresaRepository;
  }

  async execute({ empresaId }) {
    const empresa = await this.empresaRepository.buscarPorId(empresaId);
    if (!empresa) {
      throw new NotFoundError("Empresa não encontrada.");
    }
    return empresa;
  }
}

module.exports = { ConsultarEmpresaUseCase };
