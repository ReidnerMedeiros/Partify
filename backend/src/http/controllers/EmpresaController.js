/**
 * Adapta requisições HTTP para o caso de uso correspondente do RF01 — Manter Empresa.
 * Não contém regra de negócio: apenas extrai dados da requisição, chama o use case
 * e formata a resposta.
 */
class EmpresaController {
  constructor({ criarEmpresaUseCase, consultarEmpresaUseCase, atualizarEmpresaUseCase, desativarEmpresaUseCase }) {
    this.criarEmpresaUseCase = criarEmpresaUseCase;
    this.consultarEmpresaUseCase = consultarEmpresaUseCase;
    this.atualizarEmpresaUseCase = atualizarEmpresaUseCase;
    this.desativarEmpresaUseCase = desativarEmpresaUseCase;
  }

  // POST /empresas — público, primeiro contato do usuário com o sistema (fluxo básico do RF01)
  cadastrar = async (req, res) => {
    const { nome, cnpjCpf, telefone, email, loginAdministrador, senhaAdministrador } = req.body;

    const { empresa, administrador } = await this.criarEmpresaUseCase.execute({
      nome,
      cnpjCpf,
      telefone,
      email,
      loginAdministrador,
      senhaAdministrador,
    });

    return res.status(201).json({
      mensagem: "Empresa cadastrada com sucesso. Faça login para continuar.",
      empresa: apresentarEmpresa(empresa),
      administrador: apresentarUsuario(administrador),
    });
  };

  // GET /empresas/me — autenticado (fluxo alternativo A1 — consulta)
  consultarMinhaEmpresa = async (req, res) => {
    const empresa = await this.consultarEmpresaUseCase.execute({ empresaId: req.auth.empresaId });
    return res.status(200).json({ empresa: apresentarEmpresa(empresa) });
  };

  // PUT /empresas/me — autenticado (fluxo alternativo A1 — atualização)
  atualizarMinhaEmpresa = async (req, res) => {
    const { nome, telefone, email } = req.body;

    const empresa = await this.atualizarEmpresaUseCase.execute({
      empresaId: req.auth.empresaId,
      usuarioId: req.auth.usuarioId,
      nome,
      telefone,
      email,
    });

    return res.status(200).json({
      mensagem: "Dados da empresa atualizados com sucesso.",
      empresa: apresentarEmpresa(empresa),
    });
  };

  // PATCH /empresas/me/desativar — autenticado + administrador (fluxo alternativo A2)
  desativarMinhaEmpresa = async (req, res) => {
    const empresa = await this.desativarEmpresaUseCase.execute({
      empresaId: req.auth.empresaId,
      usuarioId: req.auth.usuarioId,
    });

    return res.status(200).json({
      mensagem: "Empresa desativada. Todos os usuários da instância perderão o acesso.",
      empresa: apresentarEmpresa(empresa),
    });
  };
}

// Nunca expor senhaHash na resposta HTTP.
function apresentarUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    login: usuario.login,
    perfil: usuario.perfil,
  };
}

function apresentarEmpresa(empresa) {
  return {
    id: empresa.id,
    nome: empresa.nome,
    cnpjCpf: empresa.cnpjCpf,
    telefone: empresa.telefone,
    email: empresa.email,
    status: empresa.status,
    criadoEm: empresa.criadoEm,
  };
}

module.exports = { EmpresaController };
