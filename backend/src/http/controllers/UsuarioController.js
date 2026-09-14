/**
 * Adapta requisições HTTP para os casos de uso do RF05 — Manter Usuário.
 * Todas as rotas exigem administrador autenticado (RNF06 + pré-condição do RF05).
 */
class UsuarioController {
  constructor({ criarUsuarioUseCase, listarUsuariosUseCase, atualizarUsuarioUseCase, desativarUsuarioUseCase, reativarUsuarioUseCase }) {
    this.criarUsuarioUseCase = criarUsuarioUseCase;
    this.listarUsuariosUseCase = listarUsuariosUseCase;
    this.atualizarUsuarioUseCase = atualizarUsuarioUseCase;
    this.desativarUsuarioUseCase = desativarUsuarioUseCase;
    this.reativarUsuarioUseCase = reativarUsuarioUseCase;
  }

  // POST /usuarios — RF05, fluxo básico (Criação)
  criar = async (req, res) => {
    const { nome, login, email, senha, perfil } = req.body;

    const usuario = await this.criarUsuarioUseCase.execute({
      empresaId: req.auth.empresaId,
      administradorId: req.auth.usuarioId,
      nome,
      login,
      email,
      senha,
      perfil,
    });

    return res.status(201).json({
      mensagem: "Usuário criado com sucesso.",
      usuario: apresentarUsuario(usuario),
    });
  };

  // GET /usuarios — RF05, parte de consulta do fluxo alternativo A1
  listar = async (req, res) => {
    const usuarios = await this.listarUsuariosUseCase.execute({ empresaId: req.auth.empresaId });
    return res.status(200).json({ usuarios: usuarios.map(apresentarUsuario) });
  };

  // PUT /usuarios/:id — RF05, fluxo alternativo A1 (atualização)
  atualizar = async (req, res) => {
    const { nome, login, email, perfil } = req.body;

    const usuario = await this.atualizarUsuarioUseCase.execute({
      usuarioId: req.params.id,
      empresaId: req.auth.empresaId,
      administradorId: req.auth.usuarioId,
      nome,
      login,
      email,
      perfil,
    });

    return res.status(200).json({
      mensagem: "Usuário atualizado com sucesso.",
      usuario: apresentarUsuario(usuario),
    });
  };

  // PATCH /usuarios/:id/desativar — RF05, fluxo alternativo A2
  desativar = async (req, res) => {
    const usuario = await this.desativarUsuarioUseCase.execute({
      usuarioId: req.params.id,
      empresaId: req.auth.empresaId,
      administradorId: req.auth.usuarioId,
    });

    return res.status(200).json({
      mensagem: "Usuário desativado com sucesso.",
      usuario: apresentarUsuario(usuario),
    });
  };

  // PATCH /usuarios/:id/reativar — RF05, fluxo alternativo A3
  reativar = async (req, res) => {
    const usuario = await this.reativarUsuarioUseCase.execute({
      usuarioId: req.params.id,
      empresaId: req.auth.empresaId,
      administradorId: req.auth.usuarioId,
    });

    return res.status(200).json({
      mensagem: "Usuário reativado com sucesso.",
      usuario: apresentarUsuario(usuario),
    });
  };
}

// Nunca expor senhaHash na resposta HTTP.
function apresentarUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    email: usuario.email,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm,
  };
}

module.exports = { UsuarioController };
