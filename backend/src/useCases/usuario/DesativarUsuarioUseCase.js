const { NotFoundError, ConflictError } = require("../../domain/errors/DomainErrors");
const { Perfil } = require("../../domain/enums/Perfil");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF05 — fluxo alternativo A2: desativação de um usuário. Impede novo login
 * sem apagar dados/histórico (mesmo espírito do RF01-A2, aqui a nível de
 * usuário individual em vez da instância inteira).
 */
class DesativarUsuarioUseCase {
  constructor({ usuarioRepository, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ usuarioId, empresaId, administradorId }) {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario || usuario.empresaId !== empresaId) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    if (!usuario.ativo) {
      throw new ConflictError("Este usuário já está desativado.");
    }

    // Fluxo de exceção E2 — não permite desativar o único administrador ativo.
    if (usuario.perfil === Perfil.ADMINISTRADOR) {
      const administradoresAtivos = await this.usuarioRepository.contarAdministradoresAtivos(empresaId);
      if (administradoresAtivos <= 1) {
        throw new ConflictError("Não é possível desativar o único administrador ativo da instância.");
      }
    }

    const usuarioDesativado = await this.usuarioRepository.atualizarStatus(usuarioId, false);

    await this.logAuditoriaRepository.registrar({
      usuarioId: administradorId,
      empresaId,
      tipoAcao: TipoAcao.ATIVAR_DESATIVAR_USUARIO,
      registroAfetado: usuarioId,
      detalhes: { statusAnterior: "ATIVO", statusNovo: "INATIVO" },
    });

    return usuarioDesativado;
  }
}

module.exports = { DesativarUsuarioUseCase };
