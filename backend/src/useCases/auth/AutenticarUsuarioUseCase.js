const { UnauthorizedError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");
const { StatusEmpresa } = require("../../domain/enums/StatusEmpresa");

/**
 * RF02 — Realizar Login (fluxo básico + exceções E1/E2).
 */
class AutenticarUsuarioUseCase {
  constructor({ usuarioRepository, empresaRepository, hashService, tokenService, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.empresaRepository = empresaRepository;
    this.hashService = hashService;
    this.tokenService = tokenService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ login, senha }) {
    const usuario = await this.usuarioRepository.buscarPorLogin(login?.trim());

    // Fluxo de exceção E1 (credenciais inválidas): mensagem genérica, sem indicar
    // qual campo está incorreto, conforme RNF05.
    if (!usuario || !(await this.hashService.comparar(senha ?? "", usuario.senhaHash))) {
      await this.logAuditoriaRepository.registrar({
        usuarioId: usuario?.id ?? null,
        empresaId: usuario?.empresaId ?? null,
        tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
        registroAfetado: login,
        detalhes: { motivo: "credenciais_invalidas" },
      });
      throw new UnauthorizedError("Login ou senha inválidos.");
    }

    // Fluxo de exceção E2 (conta inativa)
    if (!usuario.ativo) {
      await this.logAuditoriaRepository.registrar({
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
        registroAfetado: usuario.id,
        detalhes: { motivo: "conta_inativa" },
      });
      throw new UnauthorizedError("Esta conta está inativa. Contate o administrador do estabelecimento.");
    }

    // Decorrência do RF01-A2 (Desativar Empresa): "suspende o acesso de TODOS os
    // usuários da instância". O flag Usuario.ativo é individual, então também
    // precisamos checar o status da própria instância aqui.
    const empresa = await this.empresaRepository.buscarPorId(usuario.empresaId);
    if (!empresa || empresa.status === StatusEmpresa.INATIVA) {
      await this.logAuditoriaRepository.registrar({
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
        registroAfetado: usuario.id,
        detalhes: { motivo: "instancia_desativada" },
      });
      throw new UnauthorizedError("Esta instância está desativada. Contate o suporte para mais informações.");
    }

    const token = this.tokenService.gerar({
      sub: usuario.id,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil,
    });

    await this.logAuditoriaRepository.registrar({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      tipoAcao: TipoAcao.LOGIN,
      registroAfetado: usuario.id,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil,
        empresaId: usuario.empresaId,
      },
    };
  }
}

module.exports = { AutenticarUsuarioUseCase };
