const { NotFoundError, ValidationError, ConflictError } = require("../../domain/errors/DomainErrors");
const { validarEmail } = require("../../domain/validators/emailValidator");
const { Perfil } = require("../../domain/enums/Perfil");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const PERFIS_PERMITIDOS = [Perfil.TECNICO, Perfil.VENDEDOR];

/**
 * RF05 — fluxo alternativo A1 (parte de atualização): edição dos dados de um
 * usuário da instância (Nome, Login, E-mail, Perfil). A troca de senha não faz
 * parte deste fluxo — isso já é resolvido pelo RF04.
 */
class AtualizarUsuarioUseCase {
  constructor({ usuarioRepository, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ usuarioId, empresaId, administradorId, nome, login, email, perfil }) {
    const usuarioAtual = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuarioAtual || usuarioAtual.empresaId !== empresaId) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    const fieldErrors = {};

    if (nome !== undefined && !nome.trim()) {
      fieldErrors.nome = "O nome não pode ficar em branco.";
    }

    if (login !== undefined && !login.trim()) {
      fieldErrors.login = "O login não pode ficar em branco.";
    }

    if (email !== undefined) {
      if (!email.trim()) {
        fieldErrors.email = "Informe o e-mail do usuário.";
      } else if (!validarEmail(email)) {
        // Fluxo de exceção E1
        fieldErrors.email = "E-mail em formato inválido.";
      }
    }

    if (perfil !== undefined && !PERFIS_PERMITIDOS.includes(perfil)) {
      fieldErrors.perfil = "Perfil inválido. Selecione Técnico ou Vendedor.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível salvar as alterações. Revise os campos destacados.", fieldErrors);
    }

    if (login !== undefined && login.trim() !== usuarioAtual.login) {
      const loginEmUso = await this.usuarioRepository.buscarPorLogin(login.trim());
      if (loginEmUso) {
        throw new ConflictError("Este login já está em uso. Escolha outro login para o usuário.");
      }
    }

    const dadosAtualizados = {
      ...(nome !== undefined ? { nome: nome.trim() } : {}),
      ...(login !== undefined ? { login: login.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(perfil !== undefined ? { perfil } : {}),
    };

    // Captura o "antes" já aqui, antes de chamar o repositório (mesmo motivo
    // documentado no AtualizarEmpresaUseCase: não depender do repositório
    // devolver sempre uma instância nova).
    const camposAnteriores = this.#somenteCamposAlterados(usuarioAtual, dadosAtualizados);

    const usuarioSalvo = await this.usuarioRepository.atualizar(usuarioId, dadosAtualizados);

    await this.logAuditoriaRepository.registrar({
      usuarioId: administradorId,
      empresaId,
      tipoAcao: TipoAcao.EDICAO_USUARIO,
      registroAfetado: usuarioId,
      detalhes: { anterior: camposAnteriores, novo: dadosAtualizados },
    });

    return usuarioSalvo;
  }

  #somenteCamposAlterados(usuarioAtual, dadosAtualizados) {
    return Object.keys(dadosAtualizados).reduce((acc, campo) => {
      acc[campo] = usuarioAtual[campo];
      return acc;
    }, {});
  }
}

module.exports = { AtualizarUsuarioUseCase };
