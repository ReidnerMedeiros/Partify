const { ValidationError, ConflictError } = require("../../domain/errors/DomainErrors");
const { validarCnpjOuCpf } = require("../../domain/validators/documentValidator");
const { validarEmail } = require("../../domain/validators/emailValidator");
const { Perfil } = require("../../domain/enums/Perfil");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const SENHA_MINIMA = 8;

/**
 * RF01 — fluxo básico "Criação": cadastro público da empresa que cria, na mesma
 * operação, a instância (Empresa) e o perfil de administrador (Usuario).
 *
 * Dependências injetadas (ver src/main/factories):
 *  - empresaRepository: cria Empresa + Usuario administrador atomicamente
 *  - usuarioRepository: usado apenas para checar login duplicado antes de tentar criar
 *  - hashService: gera o hash da senha do administrador (nunca persistimos texto puro)
 *  - logAuditoriaRepository: registra CRIACAO_EMPRESA (RNF09)
 */
class CriarEmpresaUseCase {
  constructor({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository }) {
    this.empresaRepository = empresaRepository;
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute(input) {
    const dados = this.#validar(input);

    const empresaExistente = await this.empresaRepository.buscarPorCnpjCpf(dados.cnpjCpf);
    if (empresaExistente) {
      throw new ConflictError("Já existe uma empresa cadastrada com este CNPJ ou CPF.");
    }

    const usuarioExistente = await this.usuarioRepository.buscarPorLogin(dados.loginAdministrador);
    if (usuarioExistente) {
      throw new ConflictError("Este login já está em uso. Escolha outro login para o administrador.");
    }

    const senhaHash = await this.hashService.hash(dados.senhaAdministrador);

    const { empresa, administrador } = await this.empresaRepository.criar({
      nome: dados.nome,
      cnpjCpf: dados.cnpjCpf,
      telefone: dados.telefone,
      email: dados.email,
      administrador: {
        // O formulário de cadastro (Quadro 15) não coleta um "nome" separado para o
        // administrador — usamos o login como nome inicial; pode ser editado depois via RF05.
        nome: dados.loginAdministrador,
        email: dados.email,
        login: dados.loginAdministrador,
        senhaHash,
        perfil: Perfil.ADMINISTRADOR,
      },
    });

    // A própria empresa recém-criada é o escopo deste log — é o primeiro
    // registro de auditoria que pode existir para esta instância.
    await this.logAuditoriaRepository.registrar({
      usuarioId: administrador.id,
      empresaId: empresa.id,
      tipoAcao: TipoAcao.CRIACAO_EMPRESA,
      registroAfetado: empresa.id,
      detalhes: { nome: empresa.nome, cnpjCpf: empresa.cnpjCpf },
    });

    return { empresa, administrador };
  }

  #validar({ nome, cnpjCpf, telefone, email, loginAdministrador, senhaAdministrador }) {
    const fieldErrors = {};

    if (!nome?.trim()) fieldErrors.nome = "Informe o nome da empresa.";
    if (!telefone?.trim()) fieldErrors.telefone = "Informe o telefone de contato.";
    if (!loginAdministrador?.trim()) fieldErrors.loginAdministrador = "Informe o login do administrador.";

    if (!cnpjCpf?.trim()) {
      fieldErrors.cnpjCpf = "Informe o CNPJ ou CPF.";
    } else if (!validarCnpjOuCpf(cnpjCpf)) {
      // Fluxo de exceção E1 do RF01
      fieldErrors.cnpjCpf = "CNPJ ou CPF inválido. Verifique o número informado.";
    }

    if (!email?.trim()) {
      fieldErrors.email = "Informe o e-mail do administrador.";
    } else if (!validarEmail(email)) {
      // Fluxo de exceção E2 do RF01
      fieldErrors.email = "E-mail em formato inválido.";
    }

    if (!senhaAdministrador) {
      fieldErrors.senhaAdministrador = "Informe a senha do administrador.";
    } else if (senhaAdministrador.length < SENHA_MINIMA) {
      fieldErrors.senhaAdministrador = `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`;
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível concluir o cadastro. Revise os campos destacados.", fieldErrors);
    }

    return {
      nome: nome.trim(),
      cnpjCpf: cnpjCpf.trim(),
      telefone: telefone.trim(),
      email: email.trim().toLowerCase(),
      loginAdministrador: loginAdministrador.trim(),
      senhaAdministrador,
    };
  }
}

module.exports = { CriarEmpresaUseCase };
