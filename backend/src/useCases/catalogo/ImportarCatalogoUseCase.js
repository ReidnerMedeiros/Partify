const { createHash } = require("crypto");
const { ValidationError, ConflictError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const MIME_TYPE_PDF = "application/pdf";
const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024; // 50MB, conforme o protótipo da tela de importação

/**
 * RF06 — fluxo básico + A1 (marca/modelo opcionais) + E1 (formato inválido).
 * Valida e salva o PDF recebido, registrando o Catalogo em PENDENTE_EXTRACAO.
 * Não chama a IA — isso é responsabilidade do ExtrairDadosCatalogoUseCase (RF07),
 * encadeado pelo controller logo em seguida (ver ponto de extensão do RF06 no DERS).
 */
class ImportarCatalogoUseCase {
  constructor({ catalogoRepository, fileStorageService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.fileStorageService = fileStorageService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ arquivoBuffer, nomeArquivo, mimeType, marca, modelo, usuarioId, empresaId }) {
    this.#validar({ arquivoBuffer, mimeType });

    // Arquivo repetido: o mesmo PDF (mesmo conteúdo, mesmo com outro nome) já foi
    // importado por esta empresa. Recusa antes de gravar no storage e de gastar
    // uma chamada de IA. Só vale dentro da própria empresa (RNF11).
    const hashArquivo = createHash("sha256").update(arquivoBuffer).digest("hex");
    const existente = await this.catalogoRepository.buscarPorHashArquivo({ empresaId, hashArquivo });
    if (existente) {
      throw new ConflictError(
        `Este arquivo já foi importado (catálogo "${existente.nomeArquivo}"). ` +
          "Para importá-lo novamente, exclua primeiro o catálogo existente."
      );
    }

    const caminhoArquivo = await this.fileStorageService.salvar({
      buffer: arquivoBuffer,
      nomeOriginal: nomeArquivo,
      mimeType,
    });

    // RNF11 — o catálogo nasce já vinculado à empresa de quem fez o upload;
    // toda a cadeia Marca/Ferramenta/VersaoTensao/Peca resolvida a partir dele
    // (RF07/RF08) herda esse mesmo empresaId.
    const catalogo = await this.catalogoRepository.criar({ empresaId, nomeArquivo, caminhoArquivo, hashArquivo });

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.UPLOAD_VISTA_EXPLODIDA,
      registroAfetado: catalogo.id,
      detalhes: { nomeArquivo, marcaSugerida: marca ?? null, modeloSugerido: modelo ?? null },
    });

    return {
      catalogo,
      marcaSugerida: marca?.trim() || null,
      modeloSugerido: modelo?.trim() || null,
    };
  }

  #validar({ arquivoBuffer, mimeType }) {
    const fieldErrors = {};

    if (!arquivoBuffer || arquivoBuffer.length === 0) {
      fieldErrors.arquivo = "Selecione um arquivo para importar.";
    } else if (mimeType !== MIME_TYPE_PDF) {
      // Fluxo de exceção E1
      fieldErrors.arquivo = "O sistema aceita exclusivamente arquivos em formato PDF.";
    } else if (arquivoBuffer.length > TAMANHO_MAXIMO_BYTES) {
      fieldErrors.arquivo = "O arquivo excede o tamanho máximo permitido de 50MB.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível importar o arquivo. Revise os campos destacados.", fieldErrors);
    }
  }
}

module.exports = { ImportarCatalogoUseCase };
