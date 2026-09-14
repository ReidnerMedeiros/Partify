const { ValidationError, ConflictError } = require("../../domain/errors/DomainErrors");
const { validarEmail } = require("../../domain/validators/emailValidator");
const { Perfil } = require("../../domain/enums/Perfil");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const SENHA_MINIMA = 8;
const PERFIS_PERMITIDOS = [Perfil.TECNICO, Perfil.VENDEDOR];

/**
 * RF05 — fluxo básico (Criação). Réplica do Quadro 19 do DERS: o administrador
 * cria contas de Técnico ou Vendedor para a própria instância — nunca outro
 * Administrador (fora do domínio de valores do campo Perfil desta tela).
 */
class CriarUsuarioUseCase {
  constructor({ usuarioRepository, hashService, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ empresaId, administradorId, nome, login, email, senha, perfil }) {
    const dados = this.#validar({ nome, login, email, senha, perfil });

    const usuarioExistente = await this.usuarioRepository.buscarPorLogin(dados.login);
    if (usuarioExistente) {
      throw new ConflictError("Este login já está em uso. Escolha outro login para o usuário.");
    }

    const senhaHash = await this.hashService.hash(dados.senha);

    const usuarioCriado = await this.usuarioRepository.criar({
      nome: dados.nome,
      login: dados.login,
      email: dados.email,
      senhaHash,
      perfil: dados.perfil,
      empresaId,
    });

    await this.logAuditoriaRepository.registrar({
      usuarioId: administradorId,
      empresaId,
      tipoAcao: TipoAcao.CRIACAO_USUARIO,
      registroAfetado: usuarioCriado.id,
      detalhes: { nome: usuarioCriado.nome, login: usuarioCriado.login, perfil: usuarioCriado.perfil },
    });

    return usuarioCriado;
  }

  #validar({ nome, login, email, senha, perfil }) {
    const fieldErrors = {};

    if (!nome?.trim()) fieldErrors.nome = "Informe o nome do usuário.";
    if (!login?.trim()) fieldErrors.login = "Informe o login do usuário.";

    if (!email?.trim()) {
      fieldErrors.email = "Informe o e-mail do usuário.";
    } else if (!validarEmail(email)) {
      // Fluxo de exceção E1
      fieldErrors.email = "E-mail em formato inválido.";
    }

    if (!senha) {
      fieldErrors.senha = "Informe a senha do usuário.";
    } else if (senha.length < SENHA_MINIMA) {
      fieldErrors.senha = `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`;
    }

    if (!perfil) {
      fieldErrors.perfil = "Selecione o perfil do usuário.";
    } else if (!PERFIS_PERMITIDOS.includes(perfil)) {
      fieldErrors.perfil = "Perfil inválido. Selecione Técnico ou Vendedor.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível criar o usuário. Revise os campos destacados.", fieldErrors);
    }

    return {
      nome: nome.trim(),
      login: login.trim(),
      email: email.trim().toLowerCase(),
      senha,
      perfil,
    };
  }
}

module.exports = { CriarUsuarioUseCase };
