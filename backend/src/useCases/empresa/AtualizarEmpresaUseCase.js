const { NotFoundError, ValidationError } = require("../../domain/errors/DomainErrors");
const { validarEmail } = require("../../domain/validators/emailValidator");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF01 — fluxo alternativo A1 (parte de atualização): edição dos dados cadastrais
 * da empresa (Figura 7 — Protótipo tela de editar dados da empresa).
 */
class AtualizarEmpresaUseCase {
  constructor({ empresaRepository, logAuditoriaRepository }) {
    this.empresaRepository = empresaRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ empresaId, usuarioId, nome, telefone, email }) {
    const empresaAtual = await this.empresaRepository.buscarPorId(empresaId);
    if (!empresaAtual) {
      throw new NotFoundError("Empresa não encontrada.");
    }

    if (email !== undefined && !validarEmail(email)) {
      throw new ValidationError("Não foi possível salvar as alterações. Revise os campos destacados.", {
        email: "E-mail em formato inválido.",
      });
    }

    if (nome !== undefined && !nome.trim()) {
      throw new ValidationError("Não foi possível salvar as alterações. Revise os campos destacados.", {
        nome: "O nome da empresa não pode ficar em branco.",
      });
    }

    const dadosAtualizados = {
      ...(nome !== undefined ? { nome: nome.trim() } : {}),
      ...(telefone !== undefined ? { telefone: telefone.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
    };

    // Captura o "antes" já aqui, antes de chamar o repositório. Não podemos
    // assumir que `empresaAtual` continua intocado depois do `atualizar()` —
    // isso depende de a implementação do repositório sempre devolver uma
    // instância nova a cada consulta (o PrismaEmpresaRepository faz isso, mas
    // o use case não deveria depender desse detalhe de implementação).
    const camposAnteriores = this.#somenteCamposAlterados(empresaAtual, dadosAtualizados);

    const empresaSalva = await this.empresaRepository.atualizar(empresaId, dadosAtualizados);

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.EDICAO_REGISTRO,
      registroAfetado: empresaId,
      detalhes: { anterior: camposAnteriores, novo: dadosAtualizados },
    });

    return empresaSalva;
  }

  #somenteCamposAlterados(empresaAtual, dadosAtualizados) {
    return Object.keys(dadosAtualizados).reduce((acc, campo) => {
      acc[campo] = empresaAtual[campo];
      return acc;
    }, {});
  }
}

module.exports = { AtualizarEmpresaUseCase };
