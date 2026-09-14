const { ValidationError, NotFoundError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const SENHA_MINIMA = 8;

/**
 * RF04 — fluxo básico (Alterar Senha): o próprio usuário autenticado troca a
 * senha, confirmando a identidade com a senha atual. Diferente do RF04-A1
 * (RedefinirSenhaUseCase), que é acionado via link de e-mail sem sessão ativa,
 * este fluxo exige o usuário já estar logado (RNF06 — pré-condição do caso de
 * uso, garantida pelo authMiddleware antes deste Use Case ser chamado).
 */
class AlterarSenhaUseCase {
  constructor({ usuarioRepository, hashService, logAuditoriaRepository }) {
    this.usuarioRepository = usuarioRepository;
    this.hashService = hashService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ usuarioId, senhaAtual, novaSenha, confirmarNovaSenha }) {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    // Fluxo de exceção E1 — senha atual incorreta.
    const senhaAtualConfere = await this.hashService.comparar(senhaAtual ?? "", usuario.senhaHash);
    if (!senhaAtualConfere) {
      throw new ValidationError("Não foi possível alterar a senha. Revise os campos destacados.", {
        senhaAtual: "Senha atual incorreta.",
      });
    }

    if (!novaSenha || novaSenha.length < SENHA_MINIMA) {
      throw new ValidationError("Não foi possível alterar a senha. Revise os campos destacados.", {
        novaSenha: `A senha deve ter no mínimo ${SENHA_MINIMA} caracteres.`,
      });
    }

    // Fluxo de exceção E2 — nova senha e confirmação não coincidem.
    if (novaSenha !== confirmarNovaSenha) {
      throw new ValidationError("Não foi possível alterar a senha. Revise os campos destacados.", {
        confirmarNovaSenha: "As senhas não coincidem.",
      });
    }

    const novaSenhaHash = await this.hashService.hash(novaSenha);
    await this.usuarioRepository.atualizarSenha(usuarioId, novaSenhaHash);

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId: usuario.empresaId,
      tipoAcao: TipoAcao.ALTERACAO_SENHA,
      registroAfetado: usuarioId,
      detalhes: { etapa: "senha_alterada_pelo_usuario" },
    });
  }
}

module.exports = { AlterarSenhaUseCase };
