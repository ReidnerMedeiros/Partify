const { ValidarCatalogoUseCase } = require("../../../../src/useCases/catalogo/ValidarCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeValidacaoRepository } = require("../../../fakes/FakeValidacaoRepository");
const { FakeEmbeddingService } = require("../../../fakes/FakeEmbeddingService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ValidationError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarUseCaseComCatalogoExtraido() {
  const catalogoRepository = new FakeCatalogoRepository();
  const validacaoRepository = new FakeValidacaoRepository();
  const embeddingService = new FakeEmbeddingService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ValidarCatalogoUseCase({ catalogoRepository, validacaoRepository, embeddingService, logAuditoriaRepository });

  const catalogo = await catalogoRepository.criar({
    empresaId: EMPRESA_ID,
    nomeArquivo: "catalogo.pdf",
    caminhoArquivo: "fake/1-catalogo.pdf",
  });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", confianca: 95 }],
    confiancaCampos: { marca: 95, modelo: 70, tensao: 98 },
    confiancaGeral: 82,
    status: "PENDENTE_VALIDACAO",
    motivoPendencia: null,
    camposAusentes: null,
  });
  const resultadoExtraido = await catalogoRepository.buscarComPecas(catalogo.id);

  return { useCase, catalogoRepository, validacaoRepository, embeddingService, logAuditoriaRepository, catalogo, resultadoExtraido };
}

function payloadValido(resultadoExtraido, overrides = {}) {
  return {
    catalogoId: resultadoExtraido.catalogo.id,
    usuarioId: "usuario-1",
    empresaId: EMPRESA_ID,
    marca: resultadoExtraido.marca,
    modelo: resultadoExtraido.modelo,
    tensao: resultadoExtraido.tensao,
    pecas: resultadoExtraido.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
    ...overrides,
  };
}

describe("ValidarCatalogoUseCase — RF08, fluxo básico (\"Validar e Salvar\") + A1 + E1", () => {
  test("valida e salva com sucesso, marcando o catálogo como VALIDADO", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(resultado.catalogo.status).toBe("VALIDADO");
    expect(resultado.marca).toBe("Bosch");
    expect(resultado.pecas).toHaveLength(1);
  });

  test("fluxo alternativo A1: aplica edições do validador aos campos", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(
      payloadValido(resultadoExtraido, {
        modelo: "GWS 9-125S Corrigido",
        pecas: resultadoExtraido.pecas.map((p) => ({
          id: p.id,
          codigo: p.codigo,
          descricao: "Descrição corrigida pelo validador",
          posicaoVisual: p.posicaoVisual,
        })),
      })
    );

    expect(resultado.modelo).toBe("GWS 9-125S Corrigido");
    expect(resultado.pecas[0].descricao).toBe("Descrição corrigida pelo validador");
  });

  test("permite adicionar uma peça nova (sem id) além das já extraídas", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(
      payloadValido(resultadoExtraido, {
        pecas: [
          ...resultadoExtraido.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
          { codigo: "9999999999", descricao: "Peça adicionada manualmente", posicaoVisual: "20" },
        ],
      })
    );

    expect(resultado.pecas).toHaveLength(2);
    expect(resultado.pecas.some((p) => p.codigo === "9999999999")).toBe(true);
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(useCase.execute(payloadValido(resultadoExtraido, { catalogoId: "inexistente" }))).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(
      useCase.execute(payloadValido(resultadoExtraido, { empresaId: "empresa-invasora" }))
    ).rejects.toThrow(NotFoundError);
  });

  test("fluxo de exceção E1: rejeita quando marca está vazia", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(useCase.execute(payloadValido(resultadoExtraido, { marca: "" }))).rejects.toThrow(ValidationError);
  });

  test("fluxo de exceção E1: rejeita quando tensão não é selecionada", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(useCase.execute(payloadValido(resultadoExtraido, { tensao: "" }))).rejects.toThrow(ValidationError);
  });

  test("fluxo de exceção E1: rejeita quando nenhuma peça é informada", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(useCase.execute(payloadValido(resultadoExtraido, { pecas: [] }))).rejects.toThrow(ValidationError);
  });

  test("fluxo de exceção E1: rejeita quando uma peça está sem código", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(
      useCase.execute(payloadValido(resultadoExtraido, { pecas: [{ id: resultadoExtraido.pecas[0].id, codigo: "  " }] }))
    ).rejects.toThrow(ValidationError);
  });

  test("RN04: rejeita quando uma peça está sem posição visual", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    await expect(
      useCase.execute(
        payloadValido(resultadoExtraido, {
          pecas: [{ id: resultadoExtraido.pecas[0].id, codigo: "1600A004GD", posicaoVisual: "" }],
        })
      )
    ).rejects.toThrow(ValidationError);
  });

  test("registra VALIDACAO_HITL no log de auditoria", async () => {
    const { useCase, resultadoExtraido, logAuditoriaRepository } = await montarUseCaseComCatalogoExtraido();

    await useCase.execute(payloadValido(resultadoExtraido));

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("VALIDACAO_HITL");
  });

  test("cria um registro em Validacao identificando o usuário responsável", async () => {
    const { useCase, resultadoExtraido, validacaoRepository } = await montarUseCaseComCatalogoExtraido();

    await useCase.execute(payloadValido(resultadoExtraido, { usuarioId: "usuario-validador-7" }));

    expect(validacaoRepository.registros).toHaveLength(1);
    expect(validacaoRepository.registros[0].usuarioId).toBe("usuario-validador-7");
    expect(validacaoRepository.registros[0].catalogoId).toBe(resultadoExtraido.catalogo.id);
    expect(validacaoRepository.registros[0].empresaId).toBe(EMPRESA_ID);
  });

  test("gera embeddings para cada peça validada", async () => {
    const { useCase, resultadoExtraido, embeddingService, catalogoRepository } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(embeddingService.chamadas).toHaveLength(1);
    expect(catalogoRepository.embeddings[resultado.pecas[0].id]).toBeDefined();
  });

  test("uma falha ao gerar embedding não impede a validação de ser concluída com sucesso", async () => {
    const { useCase, resultadoExtraido, embeddingService } = await montarUseCaseComCatalogoExtraido();
    embeddingService.deveFalhar = true;

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(resultado.catalogo.status).toBe("VALIDADO");
  });
});
