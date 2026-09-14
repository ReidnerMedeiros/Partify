const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF10 — fluxo alternativo A3 (Exclusão do documento). Remove um documento
 * IRRESOLUVEL da fila de pendentes por completo (diferente do RF09/A4, que
 * exclui só uma peça de um catálogo já VALIDADO) — o registro Catalogo em si
 * é apagado, junto com quaisquer peças que a extração parcial (RF07/A1) tenha
 * chegado a gravar. O arquivo físico (FileStorageService) não é removido: o
 * DERS não pede isso, e a interface do serviço de armazenamento ainda não tem
 * um método de exclusão (decisão interpretativa, registrada em CONTEXTO.md).
 */
class ExcluirCatalogoUseCase {
  constructor({ catalogoRepository, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, empresaId, usuarioId }) {
    const atual = await this.catalogoRepository.buscarComPecas(catalogoId);
    if (!atual || atual.catalogo.empresaId !== empresaId || atual.catalogo.status !== StatusCatalogo.IRRESOLUVEL) {
      throw new NotFoundError("Documento pendente não encontrado.");
    }

    await this.catalogoRepository.excluirCatalogo(catalogoId);

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.EXCLUSAO_REGISTRO,
      registroAfetado: catalogoId,
      detalhes: { nomeArquivo: atual.catalogo.nomeArquivo, motivoPendencia: atual.catalogo.motivoPendencia },
    });
  }
}

module.exports = { ExcluirCatalogoUseCase };
