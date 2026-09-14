const { NotFoundError } = require("../../domain/errors/DomainErrors");

/**
 * RF09 — fornece o binário do documento original (PDF) de um catálogo, para a
 * tela de edição reexibir o "Documento Original" no split-screen (RNF01).
 * Diferente do RF06/RF08 (onde o preview usa o File ainda em memória no
 * navegador, recém-selecionado no upload), aqui o arquivo já foi salvo há mais
 * tempo — por isso precisa ser lido de volta do FileStorageService.
 */
class BaixarArquivoCatalogoUseCase {
  constructor({ catalogoRepository, fileStorageService }) {
    this.catalogoRepository = catalogoRepository;
    this.fileStorageService = fileStorageService;
  }

  async execute({ catalogoId, empresaId }) {
    const resultado = await this.catalogoRepository.buscarComPecas(catalogoId);
    if (!resultado || resultado.catalogo.empresaId !== empresaId) {
      throw new NotFoundError("Catálogo não encontrado.");
    }

    const buffer = await this.fileStorageService.obterBuffer(resultado.catalogo.caminhoArquivo);
    return { buffer, nomeArquivo: resultado.catalogo.nomeArquivo };
  }
}

module.exports = { BaixarArquivoCatalogoUseCase };
