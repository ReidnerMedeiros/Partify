const { NotFoundError, ServiceUnavailableError, ValidationError } = require("../../domain/errors/DomainErrors");
const { StatusCatalogo } = require("../../domain/enums/StatusCatalogo");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

const MENSAGEM_FORA_DOMINIO =
  "O documento enviado não parece ser uma ferramenta elétrica portátil compatível com o sistema (Bosch, Makita ou DeWalt). Verifique o arquivo e tente novamente.";

/**
 * RF07 — fluxo básico + A1 (extração parcial) + E1 (falha na Gemini API) + E2
 * (documento ilegível/sem padrão técnico). Inicia-se automaticamente logo após
 * o RF06 (o controller encadeia as duas chamadas na mesma requisição, já que o
 * projeto não tem uma fila/worker assíncrono real — ver nota em CONTEXTO.md).
 * Também é reutilizado para a "nova tentativa" citada na exceção E1, reprocessando
 * o mesmo arquivo já salvo, sem exigir novo upload, e para o "Reenviar para IA"
 * do RF10/A2 — o guarda-corpo abaixo vale em qualquer um desses pontos de entrada.
 *
 * Guarda-corpo de domínio (fora do texto do DERS, pedido explícito do usuário —
 * decisão #26 em CONTEXTO.md): quando o Agente Extrator identifica com confiança
 * que o documento NÃO é uma vista explodida de ferramenta elétrica portátil das
 * categorias/marcas suportadas (`dominioReconhecido === false`, com o documento
 * tendo sido de fato compreendido), a importação é REJEITADA por completo — o
 * catálogo recém-criado pelo RF06 é excluído (nada fica persistido) e a operação
 * lança ValidationError, impedindo que o documento chegue a qualquer fila (nem
 * IRRESOLUVEL/RF10, nem PENDENTE_VALIDACAO/RF08) de onde poderia ser validado
 * manualmente com dados forjados. Diferente da exceção E2 (documento ilegível),
 * que ainda dá o benefício da dúvida e permite preenchimento manual — aqui o
 * Agente Extrator tem confiança de que o conteúdo é de outro domínio (ex.: peça
 * automotiva), então não faz sentido oferecer edição manual.
 */
class ExtrairDadosCatalogoUseCase {
  constructor({ catalogoRepository, fileStorageService, extractionService, logAuditoriaRepository }) {
    this.catalogoRepository = catalogoRepository;
    this.fileStorageService = fileStorageService;
    this.extractionService = extractionService;
    this.logAuditoriaRepository = logAuditoriaRepository;
  }

  async execute({ catalogoId, marcaSugerida, modeloSugerido, usuarioId, empresaId }) {
    const resultadoAtual = await this.catalogoRepository.buscarComPecas(catalogoId);
    // RNF11 — um catálogo de outra empresa não pode ser reprocessado nem
    // sequer "visto" a partir desta instância; mesmo padrão do RF05
    // (AtualizarUsuarioUseCase) para checagem de posse multi-tenant.
    if (!resultadoAtual || resultadoAtual.catalogo.empresaId !== empresaId) {
      throw new NotFoundError("Catálogo não encontrado.");
    }

    const arquivoBuffer = await this.fileStorageService.obterBuffer(resultadoAtual.catalogo.caminhoArquivo);

    let extracao;
    try {
      extracao = await this.extractionService.extrairDados({
        arquivoBuffer,
        nomeArquivo: resultadoAtual.catalogo.nomeArquivo,
        marcaSugerida,
        modeloSugerido,
      });
    } catch (erro) {
      // Fluxo de exceção E1 — o arquivo permanece em PENDENTE_EXTRACAO (nada é
      // alterado no catálogo), para que uma nova tentativa possa ser feita depois.
      // A mensagem ao usuário é sempre genérica (RNF05), mas o motivo real (chave
      // inválida, modelo inexistente, sem conexão...) fica registrado no console
      // do backend para diagnóstico.
      console.error("[RF07] falha ao chamar o serviço de extração:", erro.message); // eslint-disable-line no-console
      throw new ServiceUnavailableError(
        "Não foi possível se comunicar com o serviço de extração no momento. Tente novamente em instantes."
      );
    }

    if (extracao.compreendido && !extracao.dominioReconhecido) {
      await this.catalogoRepository.excluirCatalogo(catalogoId);

      await this.logAuditoriaRepository.registrar({
        usuarioId,
        empresaId,
        tipoAcao: TipoAcao.EXCLUSAO_REGISTRO,
        registroAfetado: catalogoId,
        detalhes: {
          nomeArquivo: resultadoAtual.catalogo.nomeArquivo,
          motivo: "Rejeitado pelo guarda-corpo de domínio do Agente Extrator (fora do escopo de ferramentas elétricas suportado).",
        },
      });

      throw new ValidationError(MENSAGEM_FORA_DOMINIO, { arquivo: MENSAGEM_FORA_DOMINIO });
    }

    const { status, motivoPendencia, camposAusentes } = this.#classificarResultado(extracao);

    const resultado = await this.catalogoRepository.registrarResultadoExtracao(catalogoId, empresaId, {
      marca: extracao.marca,
      modelo: extracao.modelo,
      tensao: extracao.tensao,
      pecas: extracao.pecas,
      confiancaCampos: extracao.confiancaCampos,
      confiancaGeral: extracao.confiancaGeral,
      status,
      motivoPendencia,
      camposAusentes,
    });

    await this.logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.EXTRACAO_IA,
      registroAfetado: catalogoId,
      // Apenas metadados agregados no log — nunca o texto extraído bruto do documento.
      detalhes: { status, totalPecasIdentificadas: extracao.pecas.length, confiancaGeral: extracao.confiancaGeral },
    });

    return resultado;
  }

  #classificarResultado(extracao) {
    // Fluxo de exceção E2 — nada de aproveitável foi identificado.
    if (!extracao.compreendido && !extracao.marca && !extracao.modelo && !extracao.tensao && extracao.pecas.length === 0) {
      return {
        status: StatusCatalogo.IRRESOLUVEL,
        motivoPendencia:
          "Documento ilegível ou sem padrão técnico identificável. Preencha os campos manualmente na tela de validação.",
        camposAusentes: ["marca", "modelo", "tensao"],
      };
    }

    const camposAusentes = [];
    if (!extracao.marca) camposAusentes.push("marca");
    if (!extracao.modelo) camposAusentes.push("modelo");
    if (!extracao.tensao) camposAusentes.push("tensao");

    // Fluxo alternativo A1 — extração parcial.
    if (camposAusentes.length > 0) {
      return {
        status: StatusCatalogo.IRRESOLUVEL,
        motivoPendencia: "Extração incompleta: alguns campos obrigatórios não foram identificados automaticamente.",
        camposAusentes,
      };
    }

    // Fluxo básico — extração completa, pronta para validação humana (RF08).
    return { status: StatusCatalogo.PENDENTE_VALIDACAO, motivoPendencia: null, camposAusentes: null };
  }
}

module.exports = { ExtrairDadosCatalogoUseCase };
