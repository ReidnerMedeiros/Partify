const { TipoAcao } = require("../../domain/enums/TipoAcao");

const VALIDADE_TOKEN_MINUTOS = 30;

/**
 * RF03 — Recuperar Senha (fluxo básico + exceção E1).
 *
 * Importante: este use case NUNCA lança erro para "login/e-mail não encontrados"
 * — ele sempre conclui silenciosamente (apenas registrando o incidente no log de
 * auditoria quando aplicável). É o Controller quem sempre responde com a mesma
 * mensagem genérica, para não revelar quais contas existem na base (RNF05).
 */
class SolicitarRecuperacaoSenhaUseCase {
  constructor({ usuarioRepository, tokenRedefinicaoSenhaRepository, randomTokenService, emailService, logAuditoriaRepository, frontendUrl }) {
    this.usuarioRepository = usuarioRepository;
    this.tokenRedefinicaoSenhaRepository = tokenRedefinicaoSenhaRepository;
    this.randomTokenService = randomTokenService;
    this.emailService = emailService;
    this.logAuditoriaRepository = logAuditoriaRepository;
    this.frontendUrl = frontendUrl;
  }

  async execute({ login, email }) {
    const usuario = await this.usuarioRepository.buscarPorLogin(login?.trim());
    const emailConfere = usuario && usuario.email?.toLowerCase() === email?.trim().toLowerCase();

    if (!emailConfere) {
      // Fluxo de exceção E1 — login e e-mail não correspondem ao mesmo cadastro.
      await this.logAuditoriaRepository.registrar({
        usuarioId: usuario?.id ?? null,
        empresaId: usuario?.empresaId ?? null,
        tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
        registroAfetado: login,
        detalhes: { motivo: "recuperacao_senha_dados_nao_conferem" },
      });
      return;
    }

    const { tokenBruto, tokenHash } = this.randomTokenService.gerarTokenEHash();
    const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_MINUTOS * 60 * 1000);

    await this.tokenRedefinicaoSenhaRepository.criar({ usuarioId: usuario.id, tokenHash, expiraEm });

    const link = `${this.frontendUrl}/redefinir-senha?token=${tokenBruto}`;
    await this.emailService.enviarRedefinicaoSenha({ destinatario: usuario.email, link });

    await this.logAuditoriaRepository.registrar({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      tipoAcao: TipoAcao.ALTERACAO_SENHA,
      registroAfetado: usuario.id,
      detalhes: { etapa: "link_de_redefinicao_enviado" },
    });
  }
}

module.exports = { SolicitarRecuperacaoSenhaUseCase };
