const { NotFoundError, ConflictError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF05 — fluxo alternativo A3: reativação de um usuário previamente desativado.
 */
class ReativarUsuarioUseCase {
  constructor({ usuarioRepository, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ usuarioId, empresaId, administradorId }) {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario || usuario.empresaId !== empresaId) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    if (usuario.ativo) {
      throw new ConflictError("Este usuário já está ativo.");
    }

    const usuarioReativado = await this.usuarioRepository.atualizarStatus(usuarioId, true);

    await this.logAuditoriaRepository.registrar({
      usuarioId: administradorId,
      empresaId,
      tipoAcao: TipoAcao.ATIVAR_DESATIVAR_USUARIO,
      registroAfetado: usuarioId,
      detalhes: { statusAnterior: "INATIVO", statusNovo: "ATIVO" },
    });

    return usuarioReativado;
  }
}

module.exports = { ReativarUsuarioUseCase };
