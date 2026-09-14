const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF09 — fluxo alternativo A4 (Exclusão de registro). Remove uma peça (e o
 * embedding pgvector correspondente, apagado junto por fazer parte da mesma
 * linha) da listagem de catálogo validado. Não remove o Catalogo/Ferramenta/
 * Marca/VersaoTensao associados, mesmo que a peça excluída fosse a última —
 * decisão interpretativa (o DERS não especifica cascata), para não apagar
 * dados que outras peças da mesma empresa ainda possam referenciar.
 */
class ExcluirPecaUseCase {
  constructor({ catalogoRepository, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ pecaId, empresaId, usuarioId }) {
    const pecaExcluida = await this.catalogoRepository.excluirPeca(pecaId, empresaId);
    if (!pecaExcluida) {
      throw new NotFoundError("Peça não encontrada.");
    }

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.EXCLUSAO_REGISTRO,
      registroAfetado: pecaId,
      detalhes: { codigo: pecaExcluida.codigo, catalogoId: pecaExcluida.catalogoId },
    });

    return pecaExcluida;
  }
}

module.exports = { ExcluirPecaUseCase };
