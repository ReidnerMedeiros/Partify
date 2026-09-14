const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF02 — fluxo alternativo A1 (Logout). Invalida imediatamente o token de
 * sessão atual, marcando seu "jti" como revogado, e registra o encerramento
 * no log de auditoria.
 */
class LogoutUseCase {
  constructor({ sessaoRevogadaRepository, logAuditoriaRepository }) {
    this.sessaoRevogadaRepository = sessaoRevogadaRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ usuarioId, empresaId, jti, exp }) {
    // exp vem do payload do JWT em segundos desde a época Unix.
    const expiraEm = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.sessaoRevogadaRepository.revogar({ jti, usuarioId, expiraEm });

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.LOGOUT,
      registroAfetado: usuarioId,
    });
  }
}

module.exports = { LogoutUseCase };
