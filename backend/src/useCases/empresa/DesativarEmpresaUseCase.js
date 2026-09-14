const { NotFoundError, ConflictError } = require("../../domain/errors/DomainErrors");
const { StatusEmpresa } = require("../../domain/enums/StatusEmpresa");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF01 — fluxo alternativo A2: desativação da empresa. Suspende o acesso de todos
 * os usuários da instância sem excluir nenhum dado ou histórico (permite reativação).
 */
class DesativarEmpresaUseCase {
  constructor({ empresaRepository, logAuditoriaRepository }) {
    this.empresaRepository = empresaRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ empresaId, usuarioId }) {
    const empresa = await this.empresaRepository.buscarPorId(empresaId);
    if (!empresa) {
      throw new NotFoundError("Empresa não encontrada.");
    }

    if (empresa.status === StatusEmpresa.INATIVA) {
      throw new ConflictError("Esta empresa já está desativada.");
    }

    const empresaDesativada = await this.empresaRepository.desativar(empresaId);

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.ATIVAR_DESATIVAR_EMPRESA,
      registroAfetado: empresaId,
      detalhes: { statusAnterior: StatusEmpresa.ATIVA, statusNovo: StatusEmpresa.INATIVA },
    });

    return empresaDesativada;
  }
}

module.exports = { DesativarEmpresaUseCase };
