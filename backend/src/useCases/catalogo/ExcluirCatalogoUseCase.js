const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { STATUS_NA_FILA_DE_PENDENTES } = require("../../domain/enums/StatusCatalogo");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF10 — fluxo alternativo A3 (Exclusão do documento). Remove um documento da
 * fila de pendentes (IRRESOLUVEL ou PENDENTE_VALIDACAO) por completo (diferente
 * do RF09/A4, que exclui só uma peça de um catálogo já VALIDADO) — o registro
 * Catalogo em si é apagado, junto com quaisquer peças que a extração tenha
 * chegado a gravar, e o PDF original é removido do armazenamento
 * (FileStorageService.excluir).
 *
 * A remoção do arquivo é feita depois da exclusão no banco e é "melhor
 * esforço": se o storage falhar (arquivo já inexistente, indisponibilidade),
 * o documento continua excluído da fila e o erro só é registrado no log, para
 * a ação do usuário não ficar presa a uma falha de infraestrutura.
 */
class ExcluirCatalogoUseCase {
  constructor({ catalogoRepository, fileStorageService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.fileStorageService = fileStorageService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, empresaId, usuarioId }) {
    const atual = await this.catalogoRepository.buscarComPecas(catalogoId);
    if (!atual || atual.catalogo.empresaId !== empresaId || !STATUS_NA_FILA_DE_PENDENTES.includes(atual.catalogo.status)) {
      throw new NotFoundError("Documento pendente não encontrado.");
    }

    await this.catalogoRepository.excluirCatalogo(catalogoId);

    try {
      await this.fileStorageService.excluir(atual.catalogo.caminhoArquivo);
    } catch (erro) {
      console.error(`[storage] não foi possível remover o arquivo do catálogo ${catalogoId}:`, erro.message); // eslint-disable-line no-console
    }

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
