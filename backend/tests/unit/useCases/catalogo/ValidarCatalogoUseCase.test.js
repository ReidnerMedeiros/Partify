const { ValidarCatalogoUseCase } = require("../../../../src/useCases/catalogo/ValidarCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeValidacaoRepository } = require("../../../fakes/FakeValidacaoRepository");
const { FakeEmbeddingService } = require("../../../fakes/FakeEmbeddingService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ValidationError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");

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

  test("salva a quantidade informada pelo validador", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(
      payloadValido(resultadoExtraido, {
        pecas: resultadoExtraido.pecas.map((p) => ({
          id: p.id,
          codigo: p.codigo,
          descricao: p.descricao,
          posicaoVisual: p.posicaoVisual,
          quantidade: "3",
        })),
      })
    );

    expect(resultado.pecas[0].quantidade).toBe(3);
  });

  test("quantidade vazia é aceita e salva como nula", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(resultado.pecas[0].quantidade).toBeNull();
  });

  test("rejeita quantidade inválida (zero, negativa ou não numérica)", async () => {
    const { useCase, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();

    for (const invalida of ["0", "-2", "abc", "1,5"]) {
      await expect(
        useCase.execute(
          payloadValido(resultadoExtraido, {
            pecas: resultadoExtraido.pecas.map((p) => ({
              id: p.id,
              codigo: p.codigo,
              descricao: p.descricao,
              posicaoVisual: p.posicaoVisual,
              quantidade: invalida,
            })),
          })
        )
      ).rejects.toMatchObject({ fieldErrors: { "pecas.0.quantidade": expect.any(String) } });
    }
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

describe("ValidarCatalogoUseCase — ferramenta repetida (mesma marca, modelo e tensão já validadas)", () => {
  // Deixa na empresa informada um catálogo já VALIDADO da Bosch GWS 9-125S, V127.
  async function criarCatalogoJaValidado(catalogoRepository, empresaId = EMPRESA_ID, nomeArquivo = "existente.pdf") {
    const existente = await catalogoRepository.criar({ empresaId, nomeArquivo, caminhoArquivo: `fake/${nomeArquivo}` });
    await catalogoRepository.registrarValidacao(existente.id, empresaId, {
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12" }],
    });
    return existente;
  }

  test("recusa salvar quando já existe catálogo validado da mesma ferramenta, e o catálogo continua pendente", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository);

    await expect(useCase.execute(payloadValido(resultadoExtraido))).rejects.toThrow(ConflictError);

    const aposTentativa = await catalogoRepository.buscarComPecas(resultadoExtraido.catalogo.id);
    expect(aposTentativa.catalogo.status).toBe("PENDENTE_VALIDACAO");
  });

  test("a mensagem informa o catálogo que já contém a ferramenta", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository, EMPRESA_ID, "manual-original.pdf");

    await expect(useCase.execute(payloadValido(resultadoExtraido))).rejects.toThrow(/manual-original\.pdf/);
  });

  test("a comparação ignora maiúsculas/minúsculas e espaços nas pontas de marca e modelo", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository);

    await expect(
      useCase.execute(payloadValido(resultadoExtraido, { marca: "  BOSCH ", modelo: "gws 9-125s" }))
    ).rejects.toThrow(ConflictError);
  });

  test("não registra validação, log de auditoria nem embeddings quando recusa", async () => {
    const { useCase, catalogoRepository, resultadoExtraido, validacaoRepository, logAuditoriaRepository, embeddingService } =
      await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository);

    await expect(useCase.execute(payloadValido(resultadoExtraido))).rejects.toThrow(ConflictError);

    expect(validacaoRepository.registros ?? []).toHaveLength(0);
    expect(logAuditoriaRepository.registros).toHaveLength(0);
    expect(Object.keys(catalogoRepository.embeddings)).toHaveLength(0);
    expect(embeddingService.chamadas ?? []).toHaveLength(0);
  });

  test("a mesma ferramenta com outra tensão é aceita (são versões diferentes)", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository);

    const resultado = await useCase.execute(payloadValido(resultadoExtraido, { tensao: "V220" }));

    expect(resultado.catalogo.status).toBe("VALIDADO");
  });

  test("outro modelo da mesma marca é aceito", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository);

    const resultado = await useCase.execute(payloadValido(resultadoExtraido, { modelo: "GWS 9-115" }));

    expect(resultado.catalogo.status).toBe("VALIDADO");
  });

  test("RNF11: catálogo validado de outra empresa não bloqueia", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    await criarCatalogoJaValidado(catalogoRepository, "empresa-2");

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(resultado.catalogo.status).toBe("VALIDADO");
  });

  test("outro catálogo ainda pendente (não validado) da mesma ferramenta não bloqueia", async () => {
    const { useCase, catalogoRepository, resultadoExtraido } = await montarUseCaseComCatalogoExtraido();
    const pendente = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "outro.pdf", caminhoArquivo: "fake/outro.pdf" });
    await catalogoRepository.registrarResultadoExtracao(pendente.id, EMPRESA_ID, {
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", confianca: 90 }],
      status: "PENDENTE_VALIDACAO",
    });

    const resultado = await useCase.execute(payloadValido(resultadoExtraido));

    expect(resultado.catalogo.status).toBe("VALIDADO");
  });
});
