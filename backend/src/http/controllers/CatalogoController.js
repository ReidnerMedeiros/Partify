const { ServiceUnavailableError } = require("../../domain/errors/DomainErrors");

/**
 * Adapta requisições HTTP para os casos de uso do RF06 (Importar Catálogo), RF07
 * (Extração via IA) e RF08 (Validação HITL). Não contém regra de negócio.
 */
class CatalogoController {
  constructor({
    importarCatalogoUseCase,
    extrairDadosCatalogoUseCase,
    validarCatalogoUseCase,
    listarPecasUseCase,
    buscarCatalogoParaEdicaoUseCase,
    atualizarCatalogoUseCase,
    excluirPecaUseCase,
    baixarArquivoCatalogoUseCase,
    listarDocumentosPendentesUseCase,
    buscarDocumentoPendenteUseCase,
    excluirCatalogoUseCase,
  }) {
    this.importarCatalogoUseCase = importarCatalogoUseCase;
    this.extrairDadosCatalogoUseCase = extrairDadosCatalogoUseCase;
    this.validarCatalogoUseCase = validarCatalogoUseCase;
    this.listarPecasUseCase = listarPecasUseCase;
    this.buscarCatalogoParaEdicaoUseCase = buscarCatalogoParaEdicaoUseCase;
    this.atualizarCatalogoUseCase = atualizarCatalogoUseCase;
    this.excluirPecaUseCase = excluirPecaUseCase;
    this.baixarArquivoCatalogoUseCase = baixarArquivoCatalogoUseCase;
    this.listarDocumentosPendentesUseCase = listarDocumentosPendentesUseCase;
    this.buscarDocumentoPendenteUseCase = buscarDocumentoPendenteUseCase;
    this.excluirCatalogoUseCase = excluirCatalogoUseCase;
  }

  // POST /catalogos — RF06 (fluxo básico + A1) encadeado com RF07 (fluxo básico),
  // já que o projeto não tem fila/worker assíncrono real (ver CONTEXTO.md).
  importar = async (req, res) => {
    const { marca, modelo } = req.body;
    const arquivo = req.file;

    const { catalogo, marcaSugerida, modeloSugerido } = await this.importarCatalogoUseCase.execute({
      arquivoBuffer: arquivo?.buffer,
      nomeArquivo: arquivo?.originalname,
      mimeType: arquivo?.mimetype,
      marca,
      modelo,
      usuarioId: req.auth.usuarioId,
      empresaId: req.auth.empresaId,
    });

    try {
      const resultado = await this.extrairDadosCatalogoUseCase.execute({
        catalogoId: catalogo.id,
        marcaSugerida,
        modeloSugerido,
        usuarioId: req.auth.usuarioId,
        empresaId: req.auth.empresaId,
      });

      return res.status(201).json({
        mensagem: mensagemPorStatus(resultado.catalogo.status),
        catalogo: apresentarResultado(resultado),
      });
    } catch (erro) {
      // RF07/E1 — o upload (RF06) já foi concluído com sucesso; só a extração falhou.
      // Devolve o id do catálogo para que o frontend ofereça "tentar novamente"
      // (POST /catalogos/:id/extrair) sem exigir um novo upload do arquivo.
      if (erro instanceof ServiceUnavailableError) {
        return res.status(201).json({
          mensagem: "Arquivo recebido, mas houve falha ao processar com o serviço de extração. Você pode tentar novamente.",
          catalogo: { id: catalogo.id, nomeArquivo: catalogo.nomeArquivo, status: catalogo.status },
          erroExtracao: erro.message,
        });
      }
      throw erro;
    }
  };

  // POST /catalogos/:id/extrair — reprocessa um catálogo já importado (nova
  // tentativa após RF07/E1, sem exigir novo upload do arquivo).
  reextrair = async (req, res) => {
    const { id } = req.params;
    const { marca, modelo } = req.body;

    const resultado = await this.extrairDadosCatalogoUseCase.execute({
      catalogoId: id,
      marcaSugerida: marca,
      modeloSugerido: modelo,
      usuarioId: req.auth.usuarioId,
      empresaId: req.auth.empresaId,
    });

    return res.status(200).json({
      mensagem: mensagemPorStatus(resultado.catalogo.status),
      catalogo: apresentarResultado(resultado),
    });
  };

  // PUT /catalogos/:id/validar — RF08, "Validar e Salvar" (fluxo básico + A1).
  validar = async (req, res) => {
    const { id } = req.params;
    const { marca, modelo, tensao, pecas, observacoes } = req.body;

    const resultado = await this.validarCatalogoUseCase.execute({
      catalogoId: id,
      usuarioId: req.auth.usuarioId,
      empresaId: req.auth.empresaId,
      marca,
      modelo,
      tensao,
      pecas,
      observacoes,
    });

    return res.status(200).json({
      mensagem: "Dados validados e salvos com sucesso.",
      catalogo: apresentarResultado(resultado),
    });
  };

  // GET /catalogos — RF09/A2, lista as peças de catálogos já validados,
  // com filtros opcionais de marca/modelo/código (query string).
  listar = async (req, res) => {
    const { marca, modelo, codigo } = req.query;

    const pecas = await this.listarPecasUseCase.execute({
      empresaId: req.auth.empresaId,
      marca,
      modelo,
      codigo,
    });

    return res.status(200).json({ pecas });
  };

  // GET /catalogos/:id — RF09/A3, carrega o catálogo (já validado) pra tela
  // de edição.
  detalhar = async (req, res) => {
    const { id } = req.params;

    const resultado = await this.buscarCatalogoParaEdicaoUseCase.execute({
      catalogoId: id,
      empresaId: req.auth.empresaId,
    });

    return res.status(200).json({ catalogo: apresentarResultado(resultado) });
  };

  // GET /catalogos/:id/arquivo — reexibe o PDF original na tela de edição
  // (RNF01, tela dividida).
  baixarArquivo = async (req, res) => {
    const { id } = req.params;

    const { buffer, nomeArquivo } = await this.baixarArquivoCatalogoUseCase.execute({
      catalogoId: id,
      empresaId: req.auth.empresaId,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${nomeArquivo}"`);
    return res.status(200).send(buffer);
  };

  // PUT /catalogos/:id — RF09/A3, "Salvar Alterações".
  atualizar = async (req, res) => {
    const { id } = req.params;
    const { marca, modelo, tensao, pecas } = req.body;

    const resultado = await this.atualizarCatalogoUseCase.execute({
      catalogoId: id,
      empresaId: req.auth.empresaId,
      usuarioId: req.auth.usuarioId,
      marca,
      modelo,
      tensao,
      pecas,
    });

    return res.status(200).json({
      mensagem: "Alterações salvas com sucesso.",
      catalogo: apresentarResultado(resultado),
    });
  };

  // DELETE /catalogos/pecas/:pecaId — RF09/A4, exclusão de um registro
  // (peça), com confirmação em duas etapas já resolvida no frontend (RNF03).
  excluirPeca = async (req, res) => {
    const { pecaId } = req.params;

    await this.excluirPecaUseCase.execute({
      pecaId,
      empresaId: req.auth.empresaId,
      usuarioId: req.auth.usuarioId,
    });

    return res.status(200).json({ mensagem: "Peça excluída com sucesso." });
  };

  // GET /catalogos/pendentes — RF10 fluxo básico, a fila de documentos
  // IRRESOLUVEL da empresa.
  listarPendentes = async (req, res) => {
    const documentos = await this.listarDocumentosPendentesUseCase.execute({
      empresaId: req.auth.empresaId,
    });

    return res.status(200).json({
      documentos: documentos.map((documento) => ({
        id: documento.id,
        nomeArquivo: documento.nomeArquivo,
        situacao: documento.situacao,
        motivoPendencia: documento.motivoPendencia,
        camposAusentes: documento.camposAusentes,
        confiancaGeral: documento.confiancaGeral,
        criadoEm: documento.criadoEm,
      })),
    });
  };

  // GET /catalogos/pendentes/:id — RF10, carrega um documento pendente para a
  // tela de preenchimento (reaproveita a tela de validação do RF08).
  detalharPendente = async (req, res) => {
    const { id } = req.params;

    const resultado = await this.buscarDocumentoPendenteUseCase.execute({
      catalogoId: id,
      empresaId: req.auth.empresaId,
    });

    return res.status(200).json({ catalogo: apresentarResultado(resultado) });
  };

  // DELETE /catalogos/pendentes/:id — RF10/A3, exclusão do documento pendente,
  // com confirmação em duas etapas já resolvida no frontend (RNF03).
  excluirPendente = async (req, res) => {
    const { id } = req.params;

    await this.excluirCatalogoUseCase.execute({
      catalogoId: id,
      empresaId: req.auth.empresaId,
      usuarioId: req.auth.usuarioId,
    });

    return res.status(200).json({ mensagem: "Documento excluído com sucesso." });
  };
}

function apresentarResultado(resultado) {
  return {
    id: resultado.catalogo.id,
    nomeArquivo: resultado.catalogo.nomeArquivo,
    status: resultado.catalogo.status,
    motivoPendencia: resultado.catalogo.motivoPendencia,
    camposAusentes: resultado.catalogo.camposAusentes,
    confiancaCampos: resultado.catalogo.confiancaCampos,
    confiancaGeral: resultado.catalogo.confiancaGeral,
    marca: resultado.marca,
    modelo: resultado.modelo,
    tensao: resultado.tensao,
    pecas: resultado.pecas.map((peca) => ({
      id: peca.id,
      codigo: peca.codigo,
      descricao: peca.descricao,
      posicaoVisual: peca.posicaoVisual,
      confianca: peca.confianca,
    })),
  };
}

function mensagemPorStatus(status) {
  switch (status) {
    case "PENDENTE_VALIDACAO":
      return "Documento processado com sucesso. Revise os dados extraídos antes de salvar.";
    case "IRRESOLUVEL":
      return "Alguns dados não puderam ser identificados automaticamente. Preencha os campos destacados manualmente.";
    default:
      return "Arquivo recebido e encaminhado para processamento.";
  }
}

module.exports = { CatalogoController };
