const { NotFoundError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RF09 — exclusão de um catálogo validado inteiro (além da exclusão de uma peça
 * só, fluxo A4, que continua existindo). Remove o Catalogo, todas as suas peças
 * (com os embeddings, que ficam na mesma linha) e as validações, e apaga o PDF
 * original do armazenamento. Marca/Ferramenta/VersaoTensao não são removidas,
 * pelo mesmo motivo do ExcluirPecaUseCase: outros catálogos da empresa podem
 * referenciá-las.
 *
 * Depois da exclusão, as peças deixam de aparecer na Consulta de Componentes
 * (RF11) e na Consulta Técnica (RF12), que só leem catálogos VALIDADO.
 *
 * A remoção do arquivo é "melhor esforço": se o armazenamento falhar, o
 * catálogo continua excluído e o erro só é registrado no log do servidor.
 * Só aceita catálogos VALIDADO; documentos da fila de pendentes são excluídos
 * pelo ExcluirCatalogoUseCase (RF10/A3).
 */
class ExcluirCatalogoValidadoUseCase {
  constructor({ catalogoRepository, fileStorageService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.fileStorageService = fileStorageService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, empresaId, usuarioId }) {
    const atual = await this.catalogoRepository.buscarComPecas(catalogoId);
    if (!atual || atual.catalogo.empresaId !== empresaId || atual.catalogo.status !== StatusCatalogo.VALIDADO) {
      throw new NotFoundError("Catálogo não encontrado.");
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
      detalhes: {
        nomeArquivo: atual.catalogo.nomeArquivo,
        marca: atual.marca,
        modelo: atual.modelo,
        tensao: atual.tensao,
        totalPecas: atual.pecas.length,
      },
    });
  }
}

module.exports = { ExcluirCatalogoValidadoUseCase };
