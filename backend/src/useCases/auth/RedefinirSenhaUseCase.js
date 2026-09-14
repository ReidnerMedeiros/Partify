const { ValidationError, UnauthorizedError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const SENHA_MINIMA = 8;

/**
 * RF04 — fluxo alternativo A1 (Redefinição via link de recuperação), acionado a
 * partir do link gerado pelo RF03. Implementado já nesta etapa porque é o
 * destino natural do link enviado pelo SolicitarRecuperacaoSenhaUseCase — sem
 * ele, o RF03 não teria como ser concluído de ponta a ponta.
 */
class RedefinirSenhaUseCase {
  constructor({ usuarioRepository, tokenRedefinicaoSenhaRepository, randomTokenService, hashService, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.tokenRedefinicaoSenhaRepository = tokenRedefinicaoSenhaRepository;
    this.randomTokenService = randomTokenService;
    this.hashService = hashService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ token, novaSenha, confirmarNovaSenha }) {
    if (!novaSenha || novaSenha.length < SENHA_MINIMA) {
      throw new ValidationError("Não foi possível redefinir a senha. Revise os campos destacados.", {
        novaSenha: `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`,
      });
    }

    if (novaSenha !== confirmarNovaSenha) {
      throw new ValidationError("Não foi possível redefinir a senha. Revise os campos destacados.", {
        confirmarNovaSenha: "As senhas não coincidem.",
      });
    }

    const tokenHash = this.randomTokenService.hash(token ?? "");
    const registroToken = await this.tokenRedefinicaoSenhaRepository.buscarPorHash(tokenHash);

    const tokenValido = registroToken && !registroToken.usadoEm && registroToken.expiraEm.getTime() > Date.now();

    if (!tokenValido) {
      throw new UnauthorizedError("Este link de redefinição é inválido ou já expirou. Solicite um novo.");
    }

    const novaSenhaHash = await this.hashService.hash(novaSenha);
    await this.usuarioRepository.atualizarSenha(registroToken.usuarioId, novaSenhaHash);
    await this.tokenRedefinicaoSenhaRepository.marcarComoUsado(registroToken.id);

    // Este fluxo é acionado via link de e-mail, sem sessão ativa (RNF06 não se
    // aplica aqui) — por isso a única forma de saber a empresa do usuário para
    // o log de auditoria é buscá-lo pelo id já resolvido a partir do token.
    const usuario = await this.usuarioRepository.buscarPorId(registroToken.usuarioId);

    await this.logAuditoriaRepository.registrar({
      usuarioId: registroToken.usuarioId,
      empresaId: usuario?.empresaId ?? null,
      tipoAcao: TipoAcao.ALTERACAO_SENHA,
      registroAfetado: registroToken.usuarioId,
      detalhes: { etapa: "senha_redefinida_via_link" },
    });
  }
}

module.exports = { RedefinirSenhaUseCase };
