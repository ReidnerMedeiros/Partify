const { UnauthorizedError, ConflictError } = require("../../domain/errors/DomainErrors");
const { StatusEmpresa } = require("../../domain/enums/StatusEmpresa");
const { TipoAcao } = require("../../domain/enums/TipoAcao");
const { Perfil } = require("../../domain/enums/Perfil");

/**
 * RF01 — reativação da empresa (contrapartida do fluxo A2, desativação). Como a
 * desativação bloqueia o login de todos, a reativação é feita na própria tela de
 * login: o Administrador informa login e senha, o sistema pergunta "Deseja
 * reativar a empresa?" e, confirmando, a instância volta a ficar ATIVA. Nenhum
 * dado foi apagado na desativação, então tudo continua como estava.
 *
 * As credenciais são conferidas de novo aqui (a rota é pública) e só um
 * Administrador ativo da própria empresa pode reativá-la.
 */
class ReativarEmpresaUseCase {
  constructor({ usuarioRepository, empresaRepository, hashService, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.empresaRepository = empresaRepository;
    this.hashService = hashService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ login, senha }) {
    const usuario = await this.usuarioRepository.buscarPorLogin(login?.trim());

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

    if (!usuario.ativo || usuario.perfil !== Perfil.ADMINISTRADOR) {
      await this.logAuditoriaRepository.registrar({
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
        registroAfetado: usuario.empresaId,
        detalhes: { motivo: "reativacao_sem_permissao" },
      });
      throw new UnauthorizedError("Apenas o administrador pode reativar a empresa.");
    }

    const empresa = await this.empresaRepository.buscarPorId(usuario.empresaId);
    if (!empresa) {
      throw new UnauthorizedError("Login ou senha inválidos.");
    }
    if (empresa.status !== StatusEmpresa.INATIVA) {
      throw new ConflictError("Esta empresa já está ativa. Faça login normalmente.");
    }

    const empresaReativada = await this.empresaRepository.reativar(empresa.id);

    await this.logAuditoriaRepository.registrar({
      usuarioId: usuario.id,
      empresaId: empresa.id,
      tipoAcao: TipoAcao.ATIVAR_DESATIVAR_EMPRESA,
      registroAfetado: empresa.id,
      detalhes: { statusAnterior: StatusEmpresa.INATIVA, statusNovo: StatusEmpresa.ATIVA },
    });

    return empresaReativada;
  }
}

module.exports = { ReativarEmpresaUseCase };
