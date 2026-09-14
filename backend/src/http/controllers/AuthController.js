/**
 * Adapta requisições HTTP para os casos de uso de autenticação: RF02 (login e
 * logout), RF03 (recuperação de senha) e RF04 (alterar senha — fluxo básico —
 * e redefinir senha via link — fluxo alternativo A1).
 */
class AuthController {
  constructor({
    autenticarUsuarioUseCase,
    logoutUseCase,
    solicitarRecuperacaoSenhaUseCase,
    redefinirSenhaUseCase,
    alterarSenhaUseCase,
  }) {
    this.autenticarUsuarioUseCase = autenticarUsuarioUseCase;
    this.logoutUseCase = logoutUseCase;
    this.solicitarRecuperacaoSenhaUseCase = solicitarRecuperacaoSenhaUseCase;
    this.redefinirSenhaUseCase = redefinirSenhaUseCase;
    this.alterarSenhaUseCase = alterarSenhaUseCase;
  }

  // POST /auth/login — RF02, fluxo básico
  login = async (req, res) => {
    const { login, senha } = req.body;
    const { token, usuario } = await this.autenticarUsuarioUseCase.execute({ login, senha });

    return res.status(200).json({ token, usuario });
  };

  // POST /auth/logout — RF02, fluxo alternativo A1 (autenticado)
  logout = async (req, res) => {
    await this.logoutUseCase.execute({
      usuarioId: req.auth.usuarioId,
      empresaId: req.auth.empresaId,
      jti: req.auth.jti,
      exp: req.auth.exp,
    });

    return res.status(200).json({ mensagem: "Sessão encerrada com sucesso." });
  };

  // POST /auth/recuperar-senha — RF03, fluxo básico
  // Sempre responde com a mesma mensagem genérica, exista ou não a conta
  // informada (RNF05 — não expor quais logins/e-mails estão cadastrados).
  recuperarSenha = async (req, res) => {
    const { login, email } = req.body;
    await this.solicitarRecuperacaoSenhaUseCase.execute({ login, email });

    return res.status(200).json({
      mensagem: "Se os dados informados estiverem corretos, você receberá um e-mail com o link de redefinição em instantes.",
    });
  };

  // POST /auth/redefinir-senha — RF04, fluxo alternativo A1 (destino do link do RF03)
  redefinirSenha = async (req, res) => {
    const { token, novaSenha, confirmarNovaSenha } = req.body;
    await this.redefinirSenhaUseCase.execute({ token, novaSenha, confirmarNovaSenha });

    return res.status(200).json({ mensagem: "Senha redefinida com sucesso. Faça login com a nova senha." });
  };

  // POST /auth/alterar-senha — RF04, fluxo básico (usuário autenticado troca a própria senha)
  alterarSenha = async (req, res) => {
    const { senhaAtual, novaSenha, confirmarNovaSenha } = req.body;
    await this.alterarSenhaUseCase.execute({
      usuarioId: req.auth.usuarioId,
      senhaAtual,
      novaSenha,
      confirmarNovaSenha,
    });

    return res.status(200).json({ mensagem: "Senha alterada com sucesso." });
  };
}

module.exports = { AuthController };
